-- 1. Inserción de Usuarios (Usando el Documento de Identidad como id_usuario)
INSERT INTO USUARIO (id_usuario, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, edad, correo, contraseña, rol, ocupación) VALUES
('1002345678', 'Sergio', 'David', 'Gomez', 'Gonzales', 20, 'sergio.gomez@unicesar.edu.co', '$2b$10$hashedpassword1', 'Conductor', 'Estudiante'),
('1008765432', 'Yefferson', NULL, 'Lopez', 'Perez', 21, 'yefferson.lopez@unicesar.edu.co', '$2b$10$hashedpassword2', 'Pasajero', 'Estudiante'),
('1003456789', 'Juan', 'David', 'Rangel', 'Silva', 22, 'juan.rangel@unicesar.edu.co', '$2b$10$hashedpassword3', 'Conductor', 'Estudiante'),
('1009876543', 'Maria', 'Fernanda', 'Torres', 'Daza', 19, 'maria.torres@unicesar.edu.co', '$2b$10$hashedpassword4', 'Pasajero', 'Estudiante');

-- 2. Inserción de Rutas
INSERT INTO RUTA (origen, destino, lat_origen, lon_origen, lat_destino, lon_destino) VALUES
('Glorieta Mi Pedazo de Acordeon', 'Universidad Popular del Cesar (Sabanas)', 10.463100, -73.253200, 10.485200, -73.268100),
('Centro Comercial Guatapuri', 'Universidad Popular del Cesar (Hurtado)', 10.491500, -73.247800, 10.478900, -73.259400),
('Terminal de Transportes de Valledupar', 'Universidad Popular del Cesar (Sabanas)', 10.442100, -73.270100, 10.485200, -73.268100);

-- 3. Inserción de Teléfonos de Usuarios (Atributo multivaluado)
INSERT INTO TELEFONO_USUARIO (id_usuario, telefono) VALUES
('1002345678', '3001234567'),
('1002345678', '3119876543'),
('1008765432', '3014567890'),
('1003456789', '3167891234'),
('1009876543', '3205554433');

-- 4. Inserción de Preferencias (Relación 1:1 con Usuario)
INSERT INTO PREFERENCIA (id_usuario, prioridad_costo, prioridad_tiempo, preferir_compartir) VALUES
('1002345678', 4, 5, TRUE),
('1008765432', 5, 3, TRUE),
('1003456789', 3, 4, FALSE),
('1009876543', 5, 5, TRUE);

-- 5. Inserción de Vehículos
INSERT INTO VEHICULO (id_usuario, tipo, modelo, capacidad, foto_vehiculo) VALUES
('1002345678', 'Automovil', 'Chevrolet Spark GT 2018', 4, '/uploads/vehiculos/spark.jpg'),
('1003456789', 'Moto', 'Yamaha FZ 2.0 2021', 1, '/uploads/vehiculos/yamaha.jpg');

-- 6. Inserción en Especializaciones (Automovil y Moto)
INSERT INTO AUTOMOVIL (id_vehiculo, numero_puertas) VALUES (1, 4);
INSERT INTO MOTO (id_vehiculo, cilindraje) VALUES (2, 150);

-- 7. Inserción de Viajes (Ofertas publicadas por conductores)
INSERT INTO VIAJE (id_conductor, id_ruta, fecha_hora_salida, costo, cupos_disponibles, estado) VALUES
('1002345678', 1, '2026-10-15 06:30:00', 3000.00, 3, 'Disponible'),
('1003456789', 2, '2026-10-15 12:00:00', 2500.00, 1, 'Disponible');

-- 8. Inserción de Solicitudes (Necesidades de movilidad publicadas por pasajeros)
INSERT INTO SOLICITUD (id_usuario, id_ruta, fecha_hora, hora_limite, presupuesto, compartir) VALUES
('1008765432', 1, '2026-10-14 20:00:00', '07:00:00', 3500.00, TRUE),
('1009876543', 3, '2026-10-14 21:00:00', '06:45:00', 4000.00, TRUE);

-- 9. Inserción de Reservas (Pasajeros que apartan cupo en un viaje)
INSERT INTO RESERVA (id_viaje, id_pasajero, estado) VALUES
(1, '1008765432', 'Confirmada');

-- 10. Inserción de Mensajes (Chat interno)
INSERT INTO MENSAJE (id_emisor, id_receptor, contenido, leido) VALUES
('1008765432', '1002345678', 'Hola, ¿puedes pasar por la esquina del parque?', TRUE),
('1002345678', '1008765432', 'Claro que sí, nos vemos a las 6:30 AM.', FALSE);

-- 11. Inserción de Calificaciones
INSERT INTO CALIFICACION (id_reserva, id_evaluador, id_evaluado, puntuacion, comentario) VALUES
(1, '1008765432', '1002345678', 5, 'Excelente conductor, muy puntual y amigable.');