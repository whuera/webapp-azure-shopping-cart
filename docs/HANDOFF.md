# HANDOFF

_Última actualización: 2026-10-01 (Mac) · rama `feat/apple-design` (sale de `feature/mercadolibre`)_

## Estado actual

- `feat/apple-design`: rediseño visual estilo Apple / Liquid Glass. Solo look and feel; estructura y lógica intactas.
  - Todo vive en tokens CSS de `src/app/globals.css` (temas oscuro y claro). Componentes sin cambios salvo una clase en `Modal.tsx` (`glass-sheet`).
  - Vidrio solo en la capa flotante (sidebar, panel derecho, header, panel inferior, modal). Las tarjetas (`.glass`) son opacas a propósito: la HIG de Apple no permite vidrio en el contenido.
  - Accesibilidad: contraste de grises ≥ 4,5:1, foco visible, `prefers-reduced-transparency`, `prefers-contrast: more` y `prefers-reduced-motion` (fundidos en vez de movimiento).
  - Fuente: SF Pro (sistema) en Apple, Inter como respaldo (`--font-inter` en `layout.tsx`).
  - Skills usados: `apple-design` y `apple-design-motion`, instalados desde el repo `claude-config`.
- `feature/mercadolibre`: sincronizada. Último commit: `chore: stop tracking Claude local settings`.
- `.claude/settings.local.json` ya no se versiona (está en `.gitignore`). `.claude/launch.json` sí se mantiene.
- **Al hacer `git pull` en Windows:** git borra `settings.local.json` local. Copiarlo antes y restaurarlo después si se quieren conservar los permisos.

## Arquitectura (verificada)

```
Front Next.js (este repo, deploy Azure Web App)
  └─ NEXT_PUBLIC_API_URL → http://64.181.201.53/  (LoadBalancer en Oracle Cloud / OKE)
       └─ Backend Spring Boot (repo Backend/azure-app-shopping-cart, namespace k8s `mobilpymes`)
            └─ MySQL dentro del cluster: mysql.mobilpymes.svc.cluster.local:3306 / BD `shopping_cart`
```

- La URL de BD del backend viene del secret `db-credentials` (clave `db-url`). El `application.yml` trae por defecto un AWS RDS, pero en k8s se sobreescribe.
- Credenciales de MySQL: secret `mysql-credentials` (claves `database`, `user`, `password`).
- Health del backend: `GET /actuator/health`, `GET /health`.

### Conectarse a la BD desde local

```bash
kubectl port-forward -n mobilpymes pod/mysql-0 3307:3306
```

Cliente en `127.0.0.1:3307`, BD `shopping_cart`. Credenciales: `kubectl get secret mysql-credentials -n mobilpymes -o jsonpath='{.data.<clave>}' | base64 -d`.

### Login

`POST /api/auth/login` → `AuthServiceImpl.login()` en el backend. Tablas:

- `app_user`: busca por email, valida el hash del password, estado y bloqueo.
- `user_roles` + `role`: roles que van en el JWT.
- `login_event`: auditoría de cada intento.

## Pendientes / riesgos

1. **Workflows de Azure sin `NEXT_PUBLIC_API_URL`**: se fija en el build. Sin la variable, en producción `BASE_URL = ""` y la API apunta a la propia app de Azure. Añadirla en el paso de build de `.github/workflows/*.yml`.
2. **Backend en HTTP plano**: el front en HTTPS causa contenido mixto, y las cookies `secure: true` no viajan. Probable causa de los 401 que se estaban depurando. Hace falta HTTPS en el LoadBalancer o un dominio con TLS.
3. `src/components/layout/RightPanel.tsx` muestra "Azure SQL" fijo; la BD real es MySQL en OKE.
4. Backend: `application.yml` tiene escritas credenciales de AWS RDS. Rotarlas y moverlas a variables de entorno.

5. Diseño (no aplicado, cambia funcionalidad): la HIG desaconseja un botón propio de tema claro/oscuro; el portal tiene uno y, sin preferencia guardada, arranca en oscuro en vez de seguir al sistema.
6. Diseño: revisar `feat/apple-design` con datos reales (tablas llenas, gráficos). Se verificó solo con la API simulada en el navegador.

## Siguiente paso sugerido

Resolver los pendientes 1 y 2 (variable de build + HTTPS) y volver a probar el login en producción.
