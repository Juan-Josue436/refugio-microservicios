# Sistema de Adopción de Mascotas - Arquitectura de Microservicios

Este repositorio contiene la implementación backend de una plataforma de adopción de mascotas basada en una arquitectura de **microservicios con Node.js, Express y TypeScript**.

## 🏗️ Arquitectura del Sistema

El sistema se compone de tres servicios principales:

1. **API Gateway (`/api-gateway`)**: Puerto `3000`. Punto único de entrada, manejo de CORS, enrutamiento, autenticación con JWT y documentación Swagger.
2. **Servicio de Mascotas (`/servicio-mascotas`)**: Puerto `3001`. Administración del catálogo de mascotas (listado, creación y filtrado).
3. **Servicio de Solicitudes (`/servicio-solicitudes`)**: Puerto `3002`. Gestión de solicitudes de adopción con validaciones de mensajes.

## 🚀 Requisitos Previos

- **Node.js** (v18 o superior)
- **npm** (v9 o superior)
- **Git**

## 🔧 Instalación y Ejecución Local

### 1. Clonar el repositorio
```bash
git clone <URL_DE_TU_REPOSITORIO>
cd adopcion-mascotas