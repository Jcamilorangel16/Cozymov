# Cozymov

Cozymov es una aplicación Next.js para coordinar viajes compartidos entre
integrantes de una comunidad universitaria. El proyecto utiliza **App Router**:
las rutas viven en `app/`, mientras que la interfaz y las reglas de cada dominio
se organizan en `src/features/`.

## Estructura

```text
Frontend/
├── app/                         # Rutas de página y endpoints HTTP de Next.js
│   ├── api/
│   │   ├── login/               # Inicio y cierre de sesión
│   │   ├── mensajes/            # Consulta y envío de mensajes
│   │   ├── registro/            # Creación de cuentas
│   │   ├── vehiculo/            # Registro y consulta de vehículos
│   │   └── viajes/              # Publicación y búsqueda de viajes
│   ├── menu/                    # Página protegida del menú principal
│   ├── register/                # Página de registro
│   ├── layout.tsx               # Layout raíz, metadatos y estilos globales
│   └── page.tsx                 # Página de inicio e inicio de sesión
├── src/
│   ├── features/
│   │   ├── buscar-viajes/       # Búsqueda, resultados y orden por similitud
│   │   ├── login/               # Formulario, hook y validaciones de acceso
│   │   ├── mensajes/            # Contactos, conversaciones y envío
│   │   ├── menu-principal/      # Navegación, panel inicial y estilos del menú
│   │   ├── ofrecer-viajes/      # Vehículos, publicación y datos de ruta
│   │   ├── perfil-configuracion/# Perfil y configuración del usuario
│   │   ├── register/            # Formulario, hook y validaciones de registro
│   │   └── viajes/              # Tipos, validaciones, servicios y repositorio
│   ├── hooks/                   # Hooks compartidos entre features
│   └── lib/                     # Base de datos y utilidades de sesión
├── public/                      # Imágenes y otros recursos públicos
└── README_BASE_DATOS.md         # Documentación de configuración de la base
```

### Organización dentro de una feature

Cada dominio mantiene cerca los elementos que implementan su funcionalidad:

- `components/`: componentes visuales del dominio.
- `hooks/`: estado y comportamiento de interfaz reutilizable.
- `services/` y `repositories/`: operaciones del dominio y acceso a datos,
  cuando aplica.
- `types/`: tipos e interfaces propios del dominio.
- `validations/`: validación de datos de entrada del dominio.
- `constants/`, `utils/` y `styles/`: datos de referencia, funciones auxiliares
  y estilos propios del dominio.

Los archivos de `app/` conectan las rutas públicas con las páginas del feature
correspondiente; las reglas de negocio y la interfaz se mantienen en `src/`.

## Desarrollo

Desde esta carpeta:

```bash
npm run dev
```

Para verificar el proyecto:

```bash
npm run lint
npm run build
```
