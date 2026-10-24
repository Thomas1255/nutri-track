// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'

const db = new PGlite()
const alice = '11111111-1111-4111-8111-111111111111',
  bob = '22222222-2222-4222-8222-222222222222'
beforeAll(async () => {
  await db.exec(`create schema auth; create role anon; create role authenticated;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to authenticated;
    insert into auth.users values ('${alice}'), ('${bob}');`)
  await db.exec(readFileSync('supabase/migrations/202610240001_initial_schema.sql', 'utf8'))
}, 30000)
afterAll(() => db.close())
async function asUser(id: string) {
  await db.exec(`reset role; set role authenticated; set request.jwt.claim.sub = '${id}';`)
}
describe('PostgreSQL migration and row-level security', () => {
  it('allows each user to save and read their own profile', async () => {
    await asUser(alice)
    await db.query('insert into public.profiles(user_id, display_name) values ($1, $2)', [
      alice,
      'Alice',
    ])
    expect(
      (await db.query<{ display_name: string }>('select * from public.profiles')).rows[0]
        .display_name,
    ).toBe('Alice')
  })
  it('hides another account and blocks writing as that account', async () => {
    await asUser(bob)
    expect((await db.query('select * from public.profiles')).rows).toHaveLength(0)
    await expect(
      db.query('insert into public.nutrition_targets(user_id) values ($1)', [alice]),
    ).rejects.toThrow(/row-level security/)
    expect(
      (
        await db.query(
          'update public.profiles set display_name = $1 where user_id = $2 returning *',
          ['Hacked', alice],
        )
      ).rows,
    ).toHaveLength(0)
  })
  it('isolates foods and prevents cross-user food references', async () => {
    await asUser(alice)
    await db.query(
      `insert into public.foods(id,user_id,name,serving_size,serving_unit,calories,protein,carbs,fat) values ('33333333-3333-4333-8333-333333333333',$1,'Oats',40,'g',150,5,27,3)`,
      [alice],
    )
    await asUser(bob)
    expect((await db.query('select * from public.foods')).rows).toHaveLength(0)
    await expect(
      db.query(
        `insert into public.food_logs(user_id,log_date,meal,food_name,food_id,quantity,serving_label,per_serving,calories,protein,carbs,fat) values ($1,'2026-10-24','Lunch','Oats','33333333-3333-4333-8333-333333333333',1,'40 g','{"calories":150,"protein":5,"carbs":27,"fat":3}',150,5,27,3)`,
        [bob],
      ),
    ).rejects.toThrow(/row-level security/)
  })
  it('preserves snapshots after a custom food is removed and isolates logs', async () => {
    await asUser(alice)
    await db.query(
      `insert into public.food_logs(user_id,log_date,meal,food_name,food_id,quantity,serving_label,per_serving,calories,protein,carbs,fat) values ($1,'2026-10-24','Lunch','Oats','33333333-3333-4333-8333-333333333333',2,'40 g','{"calories":150,"protein":5,"carbs":27,"fat":3}',300,10,54,6)`,
      [alice],
    )
    await db.query('delete from public.foods where user_id = $1', [alice])
    const log = (
      await db.query<{ calories: string; food_id: string | null }>('select * from public.food_logs')
    ).rows[0]
    expect(Number(log.calories)).toBe(300)
    expect(log.food_id).toBeNull()
    await asUser(bob)
    expect((await db.query('select * from public.food_logs')).rows).toHaveLength(0)
    expect((await db.query('delete from public.food_logs returning *')).rows).toHaveLength(0)
  })
  it('rejects inconsistent totals and invalid targets', async () => {
    await asUser(alice)
    await expect(
      db.query(
        `insert into public.food_logs(user_id,log_date,meal,food_name,quantity,serving_label,per_serving,calories,protein,carbs,fat) values ($1,'2026-10-24','Lunch','Oats',2,'40 g','{"calories":150,"protein":5,"carbs":27,"fat":3}',150,10,54,6)`,
        [alice],
      ),
    ).rejects.toThrow(/check constraint/)
    await expect(
      db.query('insert into public.nutrition_targets(user_id, calories) values ($1, -1)', [alice]),
    ).rejects.toThrow(/check constraint/)
  })
  it('limits each authenticated user independently', async () => {
    await asUser(alice)
    for (let i = 0; i < 30; i++)
      expect(
        (
          await db.query<{ allowed: boolean }>(
            'select public.consume_food_search_quota() as allowed',
          )
        ).rows[0].allowed,
      ).toBe(true)
    expect(
      (await db.query<{ allowed: boolean }>('select public.consume_food_search_quota() as allowed'))
        .rows[0].allowed,
    ).toBe(false)
    await expect(db.query('delete from public.food_search_limits')).rejects.toThrow(
      /permission denied/,
    )
    await asUser(bob)
    expect(
      (await db.query<{ allowed: boolean }>('select public.consume_food_search_quota() as allowed'))
        .rows[0].allowed,
    ).toBe(true)
  })
  it('denies anonymous access to private data and the quota function', async () => {
    await db.exec('reset role; set role anon;')
    await expect(db.query('select * from public.food_logs')).rejects.toThrow(/permission denied/)
    await expect(db.query('select public.consume_food_search_quota()')).rejects.toThrow(
      /permission denied/,
    )
  })
})
