-- UADencuentros — datos de catálogo
--
-- OJO: este listado de sedes y carreras lo armé de memoria y puede estar
-- desactualizado o incompleto. Revisalo contra la web de UADE antes de darlo
-- por bueno; corregir un INSERT ahora es gratis, después no.
--
-- Ejecutar con la service_role key (el SQL Editor del dashboard ya la usa).

insert into sedes (nombre) values
  ('Monserrat'),
  ('Belgrano'),
  ('Costa Argentina'),
  ('Virtual')
on conflict (nombre) do nothing;

insert into carreras (nombre, facultad) values
  -- Ingeniería y Ciencias Exactas
  ('Ingeniería en Informática', 'Ingeniería y Ciencias Exactas'),
  ('Ingeniería Industrial', 'Ingeniería y Ciencias Exactas'),
  ('Ingeniería Electrónica', 'Ingeniería y Ciencias Exactas'),
  ('Ingeniería en Telecomunicaciones', 'Ingeniería y Ciencias Exactas'),
  ('Ingeniería en Alimentos', 'Ingeniería y Ciencias Exactas'),
  ('Licenciatura en Gestión de Tecnología de la Información', 'Ingeniería y Ciencias Exactas'),
  ('Licenciatura en Ciencia de Datos', 'Ingeniería y Ciencias Exactas'),

  -- Ciencias Económicas
  ('Contador Público', 'Ciencias Económicas'),
  ('Licenciatura en Administración de Empresas', 'Ciencias Económicas'),
  ('Licenciatura en Marketing', 'Ciencias Económicas'),
  ('Licenciatura en Comercio Internacional', 'Ciencias Económicas'),
  ('Licenciatura en Economía', 'Ciencias Económicas'),
  ('Licenciatura en Finanzas', 'Ciencias Económicas'),
  ('Licenciatura en Recursos Humanos', 'Ciencias Económicas'),
  ('Licenciatura en Negocios Digitales', 'Ciencias Económicas'),

  -- Ciencias Jurídicas y Sociales
  ('Abogacía', 'Ciencias Jurídicas y Sociales'),
  ('Licenciatura en Relaciones Internacionales', 'Ciencias Jurídicas y Sociales'),
  ('Licenciatura en Psicología', 'Ciencias Jurídicas y Sociales'),

  -- Diseño
  ('Diseño Gráfico', 'Diseño'),
  ('Diseño Industrial', 'Diseño'),
  ('Diseño de Indumentaria y Textil', 'Diseño'),
  ('Diseño Multimedial', 'Diseño'),

  -- Comunicación
  ('Licenciatura en Publicidad', 'Comunicación'),
  ('Licenciatura en Comunicación Audiovisual', 'Comunicación'),

  -- Arquitectura y Urbanismo
  ('Arquitectura', 'Arquitectura y Urbanismo')
on conflict (nombre) do nothing;

-- Las materias van vacías a propósito: conviene cargarlas por carrera cuando
-- definamos el flujo de "buscar compañero de estudio", para no llenar la tabla
-- con un plan de estudios que quizás no usemos.
