# Encuesta IA - Diagnóstico de Eficiencia Empresarial

Una aplicación inteligente que utiliza DeepSeek AI para realizar diagnósticos personalizados de eficiencia empresarial.

## 🚀 Características

- **IA Conversacional**: Utiliza DeepSeek para generar preguntas dinámicas
- **Diagnóstico Personalizado**: Análisis específico por sector empresarial
- **Informes Detallados**: Reportes con cálculos de impacto económico
- **Interfaz Intuitiva**: Experiencia de usuario fluida y profesional
- **Persistencia Local**: Guarda el progreso automáticamente

## 🛠️ Tecnologías

### Frontend
- React 18
- Vite
- CSS personalizado con sistema de diseño coherente

### Backend
- Node.js + Express
- DeepSeek AI API
- CORS habilitado

## 📦 Instalación

### 1. Instalar dependencias
```bash
npm run install:all
```

### 2. Configurar DeepSeek API
1. Obtén tu API key de [DeepSeek](https://platform.deepseek.com/)
2. Copia el archivo de ejemplo:
```bash
cp server/.env.example server/.env
```
3. Edita `server/.env` y añade tu API key:
```
DEEPSEEK_API_KEY=tu_api_key_aqui
```

### 3. Ejecutar la aplicación
```bash
npm run dev:full
```

Esto iniciará:
- Frontend en http://localhost:3000
- Backend en http://localhost:3001

## 🔧 Scripts disponibles

- `npm run dev` - Solo frontend
- `npm run dev:server` - Solo backend
- `npm run dev:full` - Frontend + Backend
- `npm run build` - Build de producción
- `npm run preview` - Preview del build

## 🏗️ Arquitectura

```
├── src/                 # Frontend React
│   ├── App.jsx         # Componente principal
│   ├── config.js       # Configuración del cliente
│   └── index.css       # Estilos globales
├── server/             # Backend Express
│   ├── index.js        # Servidor principal
│   ├── package.json    # Dependencias del servidor
│   └── .env           # Variables de entorno
└── package.json        # Configuración principal
```

## 🤖 Integración con DeepSeek

La aplicación utiliza DeepSeek AI para:

1. **Generación de preguntas dinámicas** (`/api/ai/question`)
   - Preguntas contextuales basadas en respuestas anteriores
   - Diferentes tipos: texto, múltiple opción, checkboxes
   - Adaptación por sector empresarial

2. **Generación de informes** (`/api/ai/report`)
   - Análisis completo de la conversación
   - Cálculos de impacto económico
   - Recomendaciones personalizadas

## 🔒 Variables de Entorno

```bash
# DeepSeek API
DEEPSEEK_API_KEY=tu_api_key
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1

# Servidor
PORT=3001
```

## 📱 Funcionalidades

- ✅ Flujo conversacional inteligente
- ✅ Persistencia automática del progreso
- ✅ Barra de progreso visual
- ✅ Estados de carga con mensajes contextuales
- ✅ Validación de formularios
- ✅ Diseño responsive
- ✅ Generación de informes en PDF
- ✅ Sistema de notificaciones toast

## 🎨 Sistema de Diseño

- **Colores primarios**: #FF5E00 (naranja), #FAF8F0 (crema)
- **Tipografía**: Inter (cuerpo), Poppins (títulos)
- **Componentes**: Sistema modular con CSS personalizado
- **Responsive**: Optimizado para móvil y desktop

## 🚀 Despliegue

Para desplegar en producción:

1. Configura las variables de entorno en tu servidor
2. Ejecuta `npm run build`
3. Sirve los archivos estáticos desde `dist/`
4. Ejecuta el servidor backend con `npm run start` en la carpeta `server/`

## 📄 Licencia

Este proyecto es un prototipo desarrollado para GoiLab.