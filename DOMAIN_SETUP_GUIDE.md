# Guía Completa de Configuración de Dominio y HTTPS para elarcagym.com.ar

## Información del Servidor
- **Dominio**: elarcagym.com.ar
- **IP del VPS**: 168.197.49.120
- **Puerto SSH**: 5173
- **Frontend**: localhost:4173
- **Backend**: localhost:3000

---

## PASO 1: Configurar DNS en Donweb

### 1.1 Acceder al Panel de Donweb
1. Ve a https://donweb.com
2. Ingresa con tu cuenta
3. Ve a "Mis Productos" → "Dominios"
4. Selecciona **elarcagym.com.ar**
5. Busca "Gestión DNS" o "DNS Manager"

### 1.2 Configurar Registros DNS

Crea los siguientes registros:

**Registro A (dominio raíz):**
```
Tipo:     A
Host:     @ (o vacío, o "elarcagym.com.ar")
Destino:  168.197.49.120
TTL:      3600
```

**Registro A (www):**
```
Tipo:     A
Host:     www
Destino:  168.197.49.120
TTL:      3600
```

### 1.3 Verificar DNS (desde tu máquina local)

```bash
# Verificar dominio raíz
dig elarcagym.com.ar +short

# Verificar www
dig www.elarcagym.com.ar +short

# Deberías ver: 168.197.49.120
```

**Herramientas online para verificar:**
- https://dnschecker.org
- https://www.whatsmydns.net

⏰ **Nota:** La propagación DNS puede tardar de 5 minutos a 48 horas.

---

## PASO 2: Instalar Nginx y Certbot en el VPS

### Opción A: Usar el Script Automatizado (Recomendado)

Desde tu máquina local:

```bash
# Copiar script al VPS
scp -P 5173 /tmp/setup-vps.sh root@168.197.49.120:/tmp/

# Conectar al VPS
ssh -p 5173 root@168.197.49.120

# Ejecutar el script en el VPS
bash /tmp/setup-vps.sh
```

### Opción B: Instalación Manual

Si prefieres hacerlo paso a paso, conéctate al VPS:

```bash
ssh -p 5173 root@168.197.49.120
```

Luego ejecuta:

```bash
# 1. Actualizar sistema
sudo apt update && sudo apt upgrade -y

# 2. Instalar Nginx
sudo apt install -y nginx

# 3. Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# 4. Configurar firewall
sudo ufw allow 'Nginx Full'
sudo ufw enable

# 5. Crear configuración de Nginx
sudo nano /etc/nginx/sites-available/elarcagym
```

Pega la siguiente configuración:

```nginx
server {
    listen 80;
    server_name elarcagym.com.ar www.elarcagym.com.ar;

    # Frontend
    location / {
        proxy_pass http://localhost:4173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# 6. Activar configuración
sudo ln -sf /etc/nginx/sites-available/elarcagym /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# 7. Verificar configuración
sudo nginx -t

# 8. Reiniciar Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## PASO 3: Obtener Certificado SSL

**⚠️ IMPORTANTE:** Asegúrate de que el DNS esté configurado y propagado antes de este paso.

Verifica primero:
```bash
dig elarcagym.com.ar +short
# Debe mostrar: 168.197.49.120
```

Luego, obtén el certificado:

```bash
sudo certbot --nginx -d elarcagym.com.ar -d www.elarcagym.com.ar
```

Certbot te preguntará:
1. Email (usa: admin@elarcagym.com.ar o tu email)
2. Aceptar términos de servicio (A)
3. ¿Compartir email? (N)
4. ¿Redirigir HTTP a HTTPS? (2 - recomendado)

### Configurar Renovación Automática

```bash
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Probar renovación
sudo certbot renew --dry-run
```

---

## PASO 4: Verificar que Todo Funcione

### 4.1 Verificar Nginx

```bash
sudo systemctl status nginx
sudo nginx -t
```

### 4.2 Verificar Certificado SSL

```bash
sudo certbot certificates
```

### 4.3 Probar en el Navegador

1. Abre https://elarcagym.com.ar
2. Abre https://www.elarcagym.com.ar
3. Verifica que el candado verde aparezca (HTTPS activo)

### 4.4 Verificar Puertos

```bash
# En el VPS
sudo netstat -tlnp | grep -E ':80|:443|:3000|:4173'
```

Deberías ver:
- Puerto 80 (HTTP) - Nginx
- Puerto 443 (HTTPS) - Nginx
- Puerto 3000 - Backend
- Puerto 4173 - Frontend

---

## Comandos Útiles

### Nginx
```bash
# Ver estado
sudo systemctl status nginx

# Reiniciar
sudo systemctl restart nginx

# Recargar configuración (sin downtime)
sudo systemctl reload nginx

# Ver logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Verificar configuración
sudo nginx -t
```

### Certbot
```bash
# Ver certificados
sudo certbot certificates

# Renovar manualmente
sudo certbot renew

# Probar renovación
sudo certbot renew --dry-run

# Ver logs
sudo tail -f /var/log/letsencrypt/letsencrypt.log
```

### Firewall
```bash
# Ver reglas
sudo ufw status

# Permitir puerto
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Denegar puerto
sudo ufw deny 8080/tcp
```

---

## Solución de Problemas

### Error: "Connection refused"
```bash
# Verificar que frontend y backend estén corriendo
netstat -tlnp | grep 4173
netstat -tlnp | grep 3000

# Si no están corriendo, inícilos
cd /ruta/a/frontend && npm run preview &
cd /ruta/a/backend && npm start &
```

### Error: "502 Bad Gateway"
Nginx está corriendo pero no puede conectar con el backend/frontend.
```bash
# Verificar puertos
sudo netstat -tlnp | grep -E ':3000|:4173'

# Ver logs de Nginx
sudo tail -f /var/log/nginx/error.log
```

### Error: "Certificate verification failed"
El DNS no está propagado o no apunta a la IP correcta.
```bash
# Verificar DNS
dig elarcagym.com.ar +short
nslookup elarcagym.com.ar 8.8.8.8

# Esperar propagación DNS (hasta 48 horas)
```

### Error: "nginx.conf test failed"
Error en la sintaxis de configuración.
```bash
# Ver el error específico
sudo nginx -t

# Editar configuración
sudo nano /etc/nginx/sites-available/elarcagym
```

---

## Resumen de Arquitectura

```
Internet
   ↓
elarcagym.com.ar:443 (HTTPS)
   ↓
Nginx (Proxy Reverso)
   ↓
├── / → localhost:4173 (Frontend - Vite Preview)
└── /api → localhost:3000 (Backend - Express + Prisma)
```

---

## Checklist de Verificación

- [ ] DNS configurado en Donweb
- [ ] DNS propagado (verificado con dig)
- [ ] Nginx instalado
- [ ] Certbot instalado
- [ ] Configuración de Nginx creada
- [ ] Nginx activo y sin errores
- [ ] Firewall configurado (puertos 80, 443)
- [ ] Frontend corriendo en puerto 4173
- [ ] Backend corriendo en puerto 3000
- [ ] Certificado SSL obtenido
- [ ] Renovación automática configurada
- [ ] HTTPS funcionando en el navegador
- [ ] Redirección HTTP → HTTPS activa

---

## Archivos Creados

Los siguientes archivos han sido creados en `/tmp`:

1. **setup-vps.sh** - Script de instalación automatizado
2. **nginx-elarcagym.conf** - Configuración de Nginx
3. **DNS-DONWEB-INSTRUCTIONS.md** - Guía de configuración DNS
4. **deploy-to-vps.sh** - Script para copiar archivos al VPS

Para copiar al VPS:
```bash
scp -P 5173 /tmp/setup-vps.sh root@168.197.49.120:/tmp/
```

---

## Próximos Pasos (Opcional)

### Configurar PM2 para Procesos Persistentes

```bash
# Instalar PM2
sudo npm install -g pm2

# Iniciar backend
cd /ruta/a/backend
pm2 start npm --name "elarca-backend" -- start

# Iniciar frontend
cd /ruta/a/frontend
pm2 start npm --name "elarca-frontend" -- run preview

# Guardar configuración
pm2 save
pm2 startup
```

### Configurar Logs Centralizados

```bash
# Ver logs de PM2
pm2 logs

# Ver logs de Nginx
sudo tail -f /var/log/nginx/access.log
```

### Monitoreo

```bash
# Instalar htop
sudo apt install htop

# Ver recursos
htop
```

---

**¡Configuración completada!** 🎉

Tu aplicación ahora está disponible en:
- https://elarcagym.com.ar
- https://www.elarcagym.com.ar

