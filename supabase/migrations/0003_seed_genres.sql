-- ============================================================================
-- Seed: genres + sub-genres (Hebrew). Idempotent.
-- ============================================================================
insert into genres (name) values
  ('מתח'), ('מסתורין'), ('רומן'), ('רומנטיקה'), ('פנטזיה'),
  ('מדע בדיוני'), ('היסטורי'), ('ביוגרפיה'), ('עיון'),
  ('נוער'), ('ילדים'), ('הרפתקאות'), ('אימה'), ('הומור'),
  ('קלאסיקה'), ('שירה')
on conflict (name) do nothing;

-- sub-genres under 'מתח'
insert into genres (name, parent_id)
select v.name, g.id
from (values ('מותחן פסיכולוגי'), ('מותחן משפטי'), ('מותחן ריגול')) as v(name)
cross join (select id from genres where name = 'מתח') g
on conflict (name) do nothing;
