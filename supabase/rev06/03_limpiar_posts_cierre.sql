-- =====================================================================
-- REV06-04 (datos): limpieza UNICA de posts de cierre que ya quedaron mal.
-- Ejecutar DESPUES de 02_crear_post_sold.sql. PASO 1 = solo mirar. PASO 2 = aplicar.
-- Es un soft delete (deleted_at): se puede revertir con  update posts set deleted_at = null where id in (...)
-- =====================================================================

-- PASO 1 (solo lectura): que posts se retirarian y por que.
with vigentes as (
  select p.id, p.propiedad_id, p.status as post_status, p.fecha_hora,
         pr.codigo_propiedad, pr.status as prop_status,
         row_number() over (partition by p.propiedad_id order by (p.status is not distinct from pr.status) desc, p.fecha_hora desc, p.created_at desc) as rn
  from posts p
  join propiedades pr on pr.id = p.propiedad_id
  where p.tipo = 'sold' and p.deleted_at is null
)
select id, codigo_propiedad, post_status, prop_status, fecha_hora,
       case when prop_status not in ('Vendida','Rentada') then 'la propiedad ya no esta cerrada'
            when post_status is distinct from prop_status  then 'el post no coincide con el estado actual'
            else 'duplicado: hay uno mas reciente' end as motivo
from vigentes
where prop_status not in ('Vendida','Rentada')
   or post_status is distinct from prop_status
   or rn > 1
order by codigo_propiedad, fecha_hora;

-- PASO 2 (aplicar): mismo criterio. Corre solo si el PASO 1 se ve correcto.
-- with vigentes as (
--   select p.id, p.status as post_status, pr.status as prop_status,
--          row_number() over (partition by p.propiedad_id order by (p.status is not distinct from pr.status) desc, p.fecha_hora desc, p.created_at desc) as rn
--   from posts p join propiedades pr on pr.id = p.propiedad_id
--   where p.tipo = 'sold' and p.deleted_at is null
-- )
-- update posts set deleted_at = now()
-- where id in (
--   select id from vigentes
--   where prop_status not in ('Vendida','Rentada')
--      or post_status is distinct from prop_status
--      or rn > 1
-- );
