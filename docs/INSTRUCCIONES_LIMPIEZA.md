# 🧹 Instrucciones para Limpiar el VPS

## 🎯 Objetivo
Eliminar código fuente antiguo de `/srv/elarca-gym-manager/` que NO se está usando (son restos de deployments manuales antiguos).

---

## ⚡ Opción 1: Ejecutar directamente en el servidor (RECOMENDADO)

### Paso 1: Conectarse al VPS
```bash
ssh -p 5173 root@***REMOVED***
```

### Paso 2: Copiar y pegar el script completo

Copia TODO el contenido de [cleanup-directo.sh](cleanup-directo.sh) y pégalo en la terminal SSH.

O alternativamente, descarga y ejecuta:

```bash
# En el VPS
cd /root
cat > cleanup.sh << 'EOF'
[PEGAR AQUÍ EL CONTENIDO DE cleanup-directo.sh]
EOF

chmod +x cleanup.sh
./cleanup.sh
```

---

## ⚡ Opción 2: Comandos manuales uno por uno

Si prefieres hacerlo paso a paso:

```bash
# 1. Conectarse
ssh -p 5173 root@***REMOVED***

# 2. Ver qué hay en /srv
ls -lah /srv/elarca-gym-manager/

# 3. Ver qué hay en /opt
ls -lah /opt/elarcagym/

# 4. Crear backup
mkdir -p /root/backup-elarca-$(date +%Y%m%d)
cp /srv/elarca-gym-manager/backend/.env /root/backup-elarca-$(date +%Y%m%d)/backend.env.backup 2>/dev/null || echo "No hay .env"

# 5. Comparar .env (si existen)
diff /srv/elarca-gym-manager/backend/.env /opt/elarcagym/backend/.env 2>/dev/null || echo "No se puede comparar"

# 6. Eliminar directorio antiguo
rm -rf /srv/elarca-gym-manager/

# 7. Verificar que todo siga funcionando
docker ps
ls -lah /opt/elarcagym/
```

---

## 🔍 Verificación Final

Después de la limpieza, verifica:

```bash
# ✅ El directorio antiguo NO debe existir
ls /srv/elarca-gym-manager/
# Debe mostrar: ls: cannot access '/srv/elarca-gym-manager/': No such file or directory

# ✅ El directorio correcto SÍ debe existir
ls -lah /opt/elarcagym/
# Debe mostrar:
#   - docker-compose.yml
#   - backend/ (directorio)

# ✅ Los contenedores deben seguir corriendo
docker ps
# Debe mostrar:
#   - elarca-frontend
#   - elarca-backend
#   - elarca-postgres
#   - watchtower

# ✅ El sitio debe seguir funcionando
curl -I https://elarcagym.com.ar
# Debe mostrar: HTTP/2 200
```

---

## 📊 ¿Qué se eliminará?

```
/srv/elarca-gym-manager/
├── frontend/
│   ├── App.tsx              ❌ No se usa
│   ├── components/          ❌ No se usa
│   ├── contexts/            ❌ No se usa
│   ├── dist/                ❌ No se usa
│   ├── node_modules/        ❌ No se usa (>200MB)
│   ├── .env                 ❌ No se usa
│   └── ...
└── backend/
    ├── src/                 ❌ No se usa
    ├── dist/                ❌ No se usa
    ├── node_modules/        ❌ No se usa (>400MB)
    ├── .env                 ⚠️  Backup antes de eliminar
    └── ...
```

**Total a liberar:** ~500-800 MB

---

## ✅ ¿Qué se preserva?

```
/opt/elarcagym/
├── docker-compose.yml       ✅ Se mantiene
└── backend/
    └── .env                 ✅ Se mantiene (variables secretas)

Contenedores Docker:
├── elarca-frontend          ✅ Siguen corriendo
├── elarca-backend           ✅ Siguen corriendo
├── elarca-postgres          ✅ Sigue corriendo
└── watchtower              ✅ Sigue corriendo
```

---

## ❓ FAQ

**Q: ¿Esto afectará el sitio en producción?**  
A: **NO.** El sitio corre desde contenedores Docker. `/srv/elarca-gym-manager/` NO se está usando.

**Q: ¿Y si algo sale mal?**  
A: Tenemos backup de los `.env` en `/root/backup-elarca-YYYYMMDD/`. Los contenedores Docker están intactos.

**Q: ¿Cómo verifico que todo sigue funcionando?**  
A: `docker ps` debe mostrar 4 contenedores corriendo. El sitio debe seguir accesible en https://elarcagym.com.ar

**Q: ¿Por qué había código fuente en el servidor?**  
A: Son restos de un deployment manual antiguo (antes de usar Docker). Ya no se necesitan.

---

## 🚀 Después de la limpieza

De ahora en adelante:

1. **NO copiar** código fuente al servidor
2. **Solo usar** `./deploy.sh` para deployments  
3. **Dejar que** Docker + Watchtower se encarguen de todo
4. **El código** vive en DockerHub, NO en el servidor

---

## 📞 Si tienes problemas

Si algo no funciona después de la limpieza:

```bash
# Ver logs de contenedores
docker logs elarca-frontend --tail 50
docker logs elarca-backend --tail 50

# Reiniciar contenedores
cd /opt/elarcagym
docker compose restart

# Restaurar desde backup
cp /root/backup-elarca-YYYYMMDD/backend.env.backup /opt/elarcagym/backend/.env
docker compose restart backend
```

---

**¿Listo para proceder?** 🚀

Conecta al VPS y ejecuta el script o los comandos manuales.
