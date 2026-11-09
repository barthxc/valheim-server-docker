// Language support for the panel (Spanish / English).
//
// The panel source text is Spanish. In English mode every visible string is translated on the fly:
// a MutationObserver walks text nodes and the title/placeholder/label attributes, so static HTML,
// HTML rendered from JS and messages coming from the server (errors, activity feed) are all covered.
//
// - EN: exact Spanish text -> English text. Leading emoji/symbols and trailing "…:." are kept as-is,
//   so "🔄 Reiniciar ya" only needs the entry "Reiniciar ya".
// - Keys with {placeholders} are templates: "Lugar «{a}» guardado." matches any place name.
// - To translate a new string, just add it here. Missing entries simply stay in Spanish.
//
// Also loaded by server.js (require) to translate in-game messages to PANEL_LANG.
(function () {
  const EN = {
    // ---- general / header ----
    "Panel Valheim": "Valheim Panel",
    "Panel": "Panel",
    "Conectando": "Connecting",
    "Salir": "Log out",
    "Cerrar sesión del panel": "Log out of the panel",
    "Idioma": "Language",
    "Reiniciar ahora": "Restart now",
    "El crossplay ha perdido la conexión con PlayFab (": "Crossplay has lost its connection to PlayFab (",
    "fallos en 10 min). Mientras dure, nadie podrá entrar con el código.": "failures in 10 min). While this lasts, nobody can join with the code.",
    "Se reiniciará solo en cuanto no haya nadie conectado.": "It will restart by itself as soon as nobody is online.",
    "Hay cambios en los mods que se aplicarán al reiniciar el servidor.": "There are mod changes that will apply when the server restarts.",
    "Panel sin conexión": "Panel offline",
    "Sesión caducada": "Session expired",
    "Error {a}": "Error {a}",
    "¿Seguro? Pulsa otra vez": "Sure? Click again",
    "Hecho": "Done",
    "Copiar": "Copy",
    "¡Copiado!": "Copied!",
    "Cerrar": "Close",
    "Cancelar": "Cancel",
    "Guardar": "Save",
    "Añadir": "Add",
    "Quitar": "Remove",
    "Dar": "Give",
    "Abrir": "Open",
    "Enviar": "Send",
    "Buscar": "Search",
    "Borrar": "Delete",
    "Eliminar": "Delete",
    "Cargando": "Loading",
    "Buscando": "Searching",
    "Vacía": "Empty",
    "Vacío.": "Empty.",
    "Sin datos.": "No data.",
    "Ninguna": "None",
    "Aún no": "Not yet",
    "hace {a}": "{a} ago",
    "ahora": "now",
    "hace 24 h": "24 h ago",
    "máx. {a}": "max {a}",
    "(nadie conectado)": "(nobody online)",
    "No hay nadie conectado.": "Nobody is online.",
    "No hay nadie conectado": "Nobody is online",
    "Nadie conectado.": "Nobody online.",
    "Todos los conectados": "Everyone online",
    "(sin nombre)": "(no name)",
    "(entrando…)": "(joining…)",
    "(sin respuesta)": "(no response)",

    // ---- tabs ----
    "Inicio": "Home",
    "Jugadores": "Players",
    "Mapa": "Map",
    "Objetos": "Items",
    "Mundo": "World",
    "Avisos": "Messages",
    "Ajustes": "Settings",
    "Mods y copias": "Mods & backups",
    "Consola": "Console",

    // ---- home ----
    "Estado": "Status",
    "Encendido desde hace": "Up for",
    "Último guardado": "Last save",
    "CPU": "CPU",
    "Memoria": "Memory",
    "· Versión": "· Version",
    "Servidor «{a}» · mundo «{b}»": "Server «{a}» · world «{b}»",
    "En línea": "Online",
    "Arrancando": "Starting",
    "Descargando/actualizando": "Downloading/updating",
    "Parando": "Stopping",
    "Parado": "Stopped",
    "No creado": "Not created",
    "{a} · {b} jugadores": "{a} · {b} players",
    "Cómo conectarse": "How to connect",
    "Código crossplay (desde cualquier sitio)": "Crossplay code (from anywhere)",
    "En casa (misma Wi-Fi)": "At home (same Wi-Fi)",
    "Por IP («Unirse por IP»)": "By IP («Join by IP»)",
    "Desde fuera (túnel playit)": "From outside (playit tunnel)",
    "Este panel en el móvil (misma Wi-Fi)": "This panel on your phone (same Wi-Fi)",
    "El código crossplay cambia al reiniciar y, a veces, también con el servidor en marcha; aquí verás siempre el actual. Contraseña del juego: en ⚙️ Ajustes.":
      "The crossplay code changes on restart and sometimes while the server is running; the current one is always shown here. Game password: in ⚙️ Settings.",
    "Con crossplay la IP local (192.168.…) no funciona, ni siquiera en casa: Valheim busca el servidor por la IP pública. Usa el código o «Unirse por IP» con la dirección de arriba.":
      "With crossplay the local IP (192.168.…) does not work, not even at home: Valheim looks the server up by its public IP. Use the code or «Join by IP» with the address above.",
    "Esperando a que el servidor arranque": "Waiting for the server to start",
    "Sin configurar": "Not configured",
    "Pendiente: crea el túnel en playit.gg": "Pending: create the tunnel on playit.gg",
    "Crossplay desactivado": "Crossplay disabled",
    "El servidor está parado": "The server is stopped",
    "Necesita el servidor en línea con el mod RCON": "Needs the server online with the RCON mod",
    "Mensaje para tus amigos (WhatsApp / Discord)": "Message for your friends (WhatsApp / Discord)",
    "Copiar mensaje": "Copy message",
    "Mensaje copiado.": "Message copied.",
    "Servidor de Valheim: {a}": "Valheim server: {a}",
    "Código: {a}  (Unirse a partida → Añadir servidor)": "Code: {a}  (Join game → Add server)",
    "IP: {a}": "IP: {a}",
    "Contraseña: {a}": "Password: {a}",
    "Mods necesarios (instálalos con r2modman):": "Required mods (install them with r2modman):",
    "Control del servidor": "Server control",
    "Iniciar": "Start",
    "Reiniciar ya": "Restart now",
    "Parar": "Stop",
    "Guardar mundo ahora": "Save world now",
    "Copia de seguridad ahora": "Backup now",
    "Reiniciar avisando a los jugadores": "Restart with a warning to players",
    "En 1 minuto": "In 1 minute",
    "En 5 minutos": "In 5 minutes",
    "En 10 minutos": "In 10 minutes",
    "Avisar y reiniciar": "Warn and restart",
    "Cancelar reinicio": "Cancel restart",
    "Ven el aviso en el centro de la pantalla (a los 10, 5 y 1 minutos y 10 segundos antes). Se guarda el mundo antes de reiniciar.":
      "Players see the warning in the middle of the screen (10, 5 and 1 minutes and 10 seconds before). The world is saved before restarting.",
    "Al parar o reiniciar, el servidor guarda el mundo antes de apagarse (puede tardar hasta un minuto).":
      "When stopping or restarting, the server saves the world before shutting down (it can take up to a minute).",
    "⏳ Reinicio programado a las {a}.": "⏳ Restart scheduled at {a}.",
    "Reinicio cancelado.": "Restart cancelled.",
    "Aviso enviado a los jugadores. El servidor se reiniciará a la hora indicada.": "Warning sent to players. The server will restart at the scheduled time.",
    "Iniciando": "Starting",
    "Parando (guardando el mundo)": "Stopping (saving the world)",
    "Reiniciando (guardando el mundo)": "Restarting (saving the world)",
    "Hecho: {a}": "Done: {a}",
    "iniciando": "starting",
    "parando (guardando el mundo)": "stopping (saving the world)",
    "reiniciando (guardando el mundo)": "restarting (saving the world)",
    "Actividad reciente": "Recent activity",
    "Sin actividad desde el último arranque.": "No activity since the last start.",
    "Últimas 24 horas": "Last 24 hours",
    "Recogiendo datos… (1 punto por minuto)": "Collecting data… (1 point per minute)",
    "Fallos del crossplay / min": "Crossplay failures / min",
    "Modo inmortal activado.": "Immortal mode enabled.",
    "Modo inmortal desactivado.": "Immortal mode disabled.",
    "Reinicio automático activado.": "Auto-restart enabled.",
    "Reinicio automático desactivado.": "Auto-restart disabled.",

    // ---- activity feed (texts generated by server.js) ----
    "Copia de seguridad automática": "Automatic backup",
    "Nuevo código crossplay: {a}": "New crossplay code: {a}",
    "{a} ha entrado": "{a} joined",
    "{a} ha salido": "{a} left",
    "{a} ha muerto": "{a} died",
    "Entrada rechazada: {a} (contraseña incorrecta)": "Join rejected: {a} (wrong password)",
    "Entrada rechazada: {a}": "Join rejected: {a}",
    "Mundo guardado ({a} ms)": "World saved ({a} ms)",
    "Servidor en línea": "Server online",
    "Servidor parándose": "Server stopping",
    "Reinicio automático: el crossplay había perdido la conexión": "Auto-restart: crossplay had lost its connection",
    "Reinicio programado con aviso": "Scheduled restart with warning",
    "Mod RCON preparado: reiniciando el servidor para cargarlo": "RCON mod ready: restarting the server to load it",
    "desconocido": "unknown",

    // ---- players ----
    "Para todos los conectados": "For everyone online",
    "Todos inmortales": "Everyone immortal",
    "Curar a todos": "Heal everyone",
    "Traer a todos junto a": "Bring everyone to",
    "Dar a todos el kit": "Give everyone the kit",
    "Aviso para todos (sale en el centro de la pantalla)": "Message for everyone (shown in the middle of the screen)",
    "En pantalla": "On screen",
    "En el chat": "In chat",
    "Inmortal: el servidor no puede activar el modo dios ni volar (eso solo existe en el juego de cada uno); lo que hace es curaros cada 2 segundos. Un golpe que quite toda la vida de una vez aún puede matar.":
      "Immortal: the server cannot enable god mode or flying (those only exist in each player's game); instead it heals you every 2 seconds. A single hit that takes all your health at once can still kill.",
    "Conectados ahora": "Online now",
    "Dar objeto a": "Give item to",
    "Busca en español o inglés: espada, madera, Wood": "Search in English or Spanish: sword, wood, Wood",
    "Cantidad": "Amount",
    "Calidad (1-4)": "Quality (1-4)",
    "Intentos de entrada rechazados": "Rejected join attempts",
    "Cuenta": "Account",
    "Cuándo": "When",
    "Motivo": "Reason",
    "Acciones": "Actions",
    "Han jugado en este servidor": "Have played on this server",
    "Nombre": "Name",
    "Tiempo jugado": "Time played",
    "Sesiones": "Sessions",
    "Muertes": "Deaths",
    "Última vez": "Last seen",
    "Listas": "Lists",
    "Todavía no ha entrado nadie.": "Nobody has joined yet.",
    "Admins, baneados y permitidos": "Admins, banned and allowed",
    "Administradores": "Administrators",
    "Baneados": "Banned",
    "Permitidos": "Allowed",
    "Banear": "Ban",
    "Permitidos: si la lista tiene a alguien,": "Allowed: if the list has anyone in it,",
    "solo": "only",
    "pueden entrar los que estén en ella. Los cambios se aplican al reiniciar el servidor. Tu SteamID es el número de 17 cifras de tu perfil de Steam (o búscalo en steamid.io).":
      "the people on it can join. Changes apply when the server restarts. Your SteamID is the 17-digit number of your Steam profile (or look it up on steamid.io).",
    "Quitar admin": "Remove admin",
    "Hacer admin": "Make admin",
    "Quitar de permitidos": "Remove from allowed",
    "Permitir": "Allow",
    "Desbanear": "Unban",
    "admin": "admin",
    "baneado": "banned",
    "inmortal": "immortal",
    "en línea": "online",
    "Teletransportar": "Teleport",
    "Dar objeto": "Give item",
    "Kit": "Kit",
    "Inmortal": "Immortal",
    "Inmortal ✓": "Immortal ✓",
    "Curar": "Heal",
    "Moderación ▾": "Moderation ▾",
    "Expulsar": "Kick",
    "Banear ya": "Ban now",
    "{a} km del centro": "{a} km from the center",
    "x {a} · z {b} · altura {c}": "x {a} · z {b} · height {c}",
    "Contraseña incorrecta": "Wrong password",
    "Está baneado": "Is banned",
    "No está en la lista de permitidos": "Not on the allowed list",
    "Desconocido (¿versión o mods distintos?)": "Unknown (different version or mods?)",
    "Lista actualizada. Se aplica al reiniciar el servidor (o en el próximo intento de entrar).": "List updated. It applies when the server restarts (or on the next join attempt).",
    "Expulsado: {a}": "Kicked: {a}",
    "Baneado: {a}": "Banned: {a}",
    "Elige un objeto de la lista (al escribir aparecen sugerencias).": "Pick an item from the list (suggestions appear as you type).",
    "ID no válido. Usa el SteamID de 17 cifras.": "Invalid ID. Use the 17-digit SteamID.",
    "Añadido. Se aplica al reiniciar el servidor.": "Added. It applies when the server restarts.",
    "Quitado de la lista.": "Removed from the list.",

    // ---- player actions (extra.js) ----
    "¿A dónde llevar a {a}?": "Where should {a} go?",
    "Junto a un jugador": "Next to a player",
    "Junto a {a}": "Next to {a}",
    "No hay más jugadores conectados.": "No other players online.",
    "Traer a todos junto a {a}": "Bring everyone to {a}",
    "A un lugar": "To a place",
    "Al centro del mundo": "To the world center",
    "Donde murió ({a})": "Where they died ({a})",
    "Elegir en el mapa": "Pick on the map",
    "Guardar dónde está ahora como lugar": "Save current position as a place",
    "Dar kit a {a}": "Give kit to {a}",
    "Los kits se editan en la pestaña 🎁 Objetos.": "Kits are edited in the 🎁 Items tab.",
    "Tarda unos segundos en llegar.": "It takes a few seconds to arrive.",
    "Nombre del lugar (ej: Base, Portal del pantano):": "Place name (e.g. Base, Swamp portal):",
    "Base de {a}": "{a}'s base",
    "Lugar {a}": "Place {a}",
    "Lugar «{a}» guardado.": "Place «{a}» saved.",
    "Pulsa en el mapa el punto al que llevar a {a}.": "Click the point on the map where {a} should go.",
    "Escribe el aviso primero.": "Write the message first.",
    "Aviso enviado.": "Message sent.",
    "{a} curado": "{a} healed",
    "{a} jugadores curados": "{a} players healed",
    "{a} jugador(es) teletransportados": "{a} player(s) teleported",
    "{a} entregado a {b} jugador(es)": "{a} given to {b} player(s)",
    "{a} objetos borrados": "{a} items deleted",

    // ---- map ----
    "Mapa en vivo": "Live map",
    "Todo el mundo": "Whole world",
    "Centrar en jugadores": "Center on players",
    "Mapa completo de la semilla ↗": "Full seed map ↗",
    "Pulsa en el mapa para marcar un punto o llevar a alguien. Rueda o botones para el zoom, arrastra para moverte.":
      "Click the map to mark a point or send someone there. Wheel or buttons to zoom, drag to move.",
    "Lugares guardados": "Saved places",
    "Pulsa un jugador de la lista y luego un punto del mapa para llevarlo allí. El servidor no conoce los biomas ni lo explorado (eso se guarda en el juego de cada uno); para verlos usa «Mapa completo de la semilla» (semilla":
      "Click a player in the list and then a point on the map to send them there. The server does not know the biomes or what has been explored (that is stored in each player's game); to see them use «Full seed map» (seed",
    "desconocida": "unknown",
    "Centro": "Center",
    "x {a} · z {b} ({c} km del centro)": "x {a} · z {b} ({c} km from the center)",
    "Punto x {a} · z {b}": "Point x {a} · z {b}",
    "fuera del mundo": "outside the world",
    "Marcar aquí en el mapa de todos": "Mark here on everyone's map",
    "Llevar a {a} aquí": "Send {a} here",
    "Guardar como lugar": "Save as place",
    "Ver a todos": "Show everyone",
    "Al teletransportar a un punto del mapa el juego busca el suelo solo; tarda unos segundos en colocarlo (en el mar, aparece nadando).":
      "When teleporting to a map point the game finds the ground by itself; it takes a few seconds to place them (at sea, they appear swimming).",
    "Aún no hay. Pulsa un punto del mapa → «Guardar como lugar».": "None yet. Click a point on the map → «Save as place».",
    "{a} elegido: pulsa un punto del mapa para llevarlo allí.": "{a} selected: click a point on the map to send them there.",
    "Punto marcado en el mapa de todos los jugadores.": "Point marked on every player's map.",

    // ---- items ----
    "Kits": "Kits",
    "Dar a:": "Give to:",
    "Nuevo kit": "New kit",
    "Nombre del kit": "Kit name",
    "Objetos (uno por línea:": "Items (one per line:",
    "Objeto cantidad": "Item amount",
    ", por ejemplo": ", for example",
    "Borrar kit": "Delete kit",
    "No hay kits.": "No kits.",
    "No entiendo estas líneas: {a}": "I don't understand these lines: {a}",
    "Formato: Objeto cantidad (ej. Wood 50)": "Format: Item amount (e.g. Wood 50)",
    "Kit guardado.": "Kit saved.",
    "Aviso: no conozco {a} (si el nombre es correcto, funcionará igual).": "Warning: unknown item {a} (if the name is right, it will still work).",
    "Kit borrado.": "Kit deleted.",
    "Cofres cerca de un jugador": "Chests near a player",
    "Buscar cofres (30 m)": "Find chests (30 m)",
    "Añadir objeto": "Add item",
    "No hay cofres a menos de 30 m de ese jugador.": "No chests within 30 m of that player.",
    "{a} · a {b} m": "{a} · {b} m away",
    "cofre reforzado": "reinforced chest",
    "wood": "wood",
    "private": "private",
    "blackmetal": "black metal",
    "barrel": "barrel",
    "Cofre {a}": "Chest {a}",
    "nivel {a}": "level {a}",
    "Buscar objetos": "Find items",
    "Escribe para buscar: hierro, comida, flecha": "Type to search: iron, food, arrow",
    "Lista completa de nombres (en inglés):": "Full list of names:",
    "Nada encontrado. Lista completa (en inglés):": "Nothing found. Full list:",
    "Copiar nombre": "Copy name",
    "Copiado: {a}": "Copied: {a}",
    "Materiales": "Materials",
    "Metales": "Metals",
    "Herramientas": "Tools",
    "Armas": "Weapons",
    "Armaduras": "Armor",
    "Comida": "Food",
    "Pociones": "Potions",
    "Semillas": "Seeds",
    "Jefes": "Bosses",
    "Criaturas": "Creatures",
    "⚠️ Jefes": "⚠️ Bosses",

    // ---- world ----
    "Progreso de jefes": "Boss progress",
    "Marcar un jefe como derrotado cambia el mundo como si lo hubierais matado (por ejemplo, qué enemigos aparecen en los asaltos). No da trofeos ni recompensas.":
      "Marking a boss as defeated changes the world as if you had killed it (for example, which enemies appear in raids). It gives no trophies or rewards.",
    "derrotado": "defeated",
    "pendiente": "pending",
    "Marcar derrotado": "Mark defeated",
    "Eventos e invasiones": "Events and raids",
    "Junto a:": "Next to:",
    "Lanzar": "Start",
    "Ahora mismo: {a}": "Right now: {a}",
    "No hay ningún evento activo.": "No event is active.",
    "Aparecer criaturas": "Spawn creatures",
    "Estrellas": "Stars",
    "Sin estrellas": "No stars",
    "Domesticado": "Tamed",
    "Aparecer": "Spawn",
    "Aparece a unos 5 m del jugador. Cuidado con los jefes.": "Spawns about 5 m from the player. Careful with bosses.",
    "Limpiar objetos tirados": "Clean up dropped items",
    "Alrededor de:": "Around:",
    "Borrar los marcados": "Delete selected",
    "Solo busca objetos sueltos en el suelo (madera, piedras, botín…). Nunca borra construcciones, cofres ni lo que hay dentro.":
      "Only looks for loose items on the ground (wood, stones, loot…). It never deletes buildings, chests or their contents.",
    "Buscando… (puede tardar unos segundos)": "Searching… (it can take a few seconds)",
    "{a} en el suelo": "{a} on the ground",
    "No hay objetos tirados a menos de {a} m.": "No dropped items within {a} m.",
    "Ejército de Eikthyr (jabalíes y ciervos)": "Eikthyr's army (boars and deer)",
    "Ejército del Anciano (greydwarfs)": "The Elder's army (greydwarfs)",
    "Ejército de Bonemass (draugr)": "Bonemass's army (draugr)",
    "Ejército de Moder (dracos)": "Moder's army (drakes)",
    "Horda fuling": "Fuling horde",
    "Buscadores": "Seekers",
    "Ejército carbonizado": "Charred army",
    "Carbonizados con invocadores": "Charred with summoners",
    "Manada de lobos": "Wolf pack",
    "Esqueletos": "Skeletons",
    "Légamos": "Blobs",
    "Trolls del bosque": "Forest trolls",
    "Fantasmas": "Ghosts",
    "Murciélagos": "Bats",
    "Fimbulvinter (helada)": "Fimbulvinter (frost)",
    "Fuling de gemas": "Gem fuling",
    "Jefe: Eikthyr": "Boss: Eikthyr",
    "Jefe: el Anciano": "Boss: The Elder",
    "Jefe: Bonemass": "Boss: Bonemass",
    "Jefe: Moder": "Boss: Moder",
    "Jefe: Yagluth": "Boss: Yagluth",
    "Jefe: la Reina": "Boss: The Queen",
    "Jefe: Fader": "Boss: Fader",
    "Jefe: rey helado": "Boss: frozen king",
    "Hildir: Zil y Thungr": "Hildir: Zil and Thungr",
    "El Anciano": "The Elder",
    "La Reina": "The Queen",

    // ---- messages ----
    "Mensaje de bienvenida": "Welcome message",
    "Ej: ¡Bienvenido, {nombre}! La base está al norte.": "E.g.: Welcome, {name}! The base is to the north.",
    "Sale en el centro de la pantalla de todos cuando alguien entra.": "Shown in the middle of everyone's screen when someone joins.",
    "{nombre}": "{name}",
    "se cambia por el nombre del jugador. Vacío = sin bienvenida.": "is replaced by the player's name. Empty = no welcome.",
    "Mensajes programados": "Scheduled messages",
    "Añadir mensaje": "Add message",
    "Solo se envían si hay alguien conectado. Para un aviso ahora mismo, usa «Aviso para todos» en 👥 Jugadores. El reinicio con aviso está en 🏠 Inicio.":
      "They are only sent when someone is online. For a message right now, use «Message for everyone» in 👥 Players. The restart with warning is in 🏠 Home.",
    "Guardar avisos": "Save messages",
    "Texto del mensaje": "Message text",
    "cada": "every",
    "min": "min",
    "No hay mensajes programados.": "No scheduled messages.",
    "Avisos guardados.": "Messages saved.",

    // ---- settings ----
    "Servidor": "Server",
    "Nombre del servidor": "Server name",
    "Nombre del mundo (letras, números, - y _)": "World name (letters, numbers, - and _)",
    "Contraseña del juego (mín. 5 caracteres, no puede estar dentro del nombre)": "Game password (min. 5 characters, cannot be part of the name)",
    "Crossplay (código de unión, Xbox/PC Game Pass)": "Crossplay (join code, Xbox/PC Game Pass)",
    "Aparecer en la lista pública de servidores": "Show in the public server list",
    "Mods (BepInEx) activados": "Mods (BepInEx) enabled",
    "Cambiar el nombre del mundo crea un mundo nuevo (el anterior no se borra).": "Changing the world name creates a new world (the old one is not deleted).",
    "Dificultad del mundo": "World difficulty",
    "Preajuste": "Preset",
    "(por defecto)": "(default)",
    "Opciones extra": "Extra options",
    "Mantenimiento": "Maintenance",
    "Copias de seguridad automáticas": "Automatic backups",
    "Cada hora": "Every hour",
    "Cada 2 horas": "Every 2 hours",
    "Cada 6 horas": "Every 6 hours",
    "Una vez al día (4:00)": "Once a day (4:00)",
    "Borrar copias con más de (días)": "Delete backups older than (days)",
    "Reinicio automático diario": "Daily automatic restart",
    "Nunca": "Never",
    "Todos los días a las 5:00": "Every day at 5:00",
    "Los lunes a las 6:00": "Mondays at 6:00",
    "Actualizar Valheim automáticamente cuando no haya nadie": "Update Valheim automatically when nobody is online",
    "Del panel (se guarda al momento, sin reiniciar)": "Panel options (saved instantly, no restart)",
    "Reiniciar solo si el crossplay se queda sin conexión y no hay nadie conectado (máx. una vez por hora)":
      "Restart automatically if crossplay loses its connection and nobody is online (max. once per hour)",
    "Guardar y aplicar (reinicia el servidor)": "Save and apply (restarts the server)",
    "Solo guardar": "Save only",
    "Al aplicar se recrea el servidor con los ajustes nuevos; los jugadores conectados se desconectan un momento.":
      "Applying recreates the server with the new settings; connected players are disconnected for a moment.",
    "Personalizado: {a}": "Custom: {a}",
    "Ajustes guardados. Se aplicarán la próxima vez que pulses «Guardar y aplicar».": "Settings saved. They will apply the next time you click «Save and apply».",
    "Guardado. Aplicando (recreando el servidor)…": "Saved. Applying (recreating the server)…",
    "Ajustes aplicados. El servidor está arrancando de nuevo.": "Settings applied. The server is starting again.",
    "Normal": "Normal",
    "Casual": "Casual",
    "Fácil": "Easy",
    "Difícil": "Hard",
    "Hardcore": "Hardcore",
    "Inmersivo": "Immersive",
    "Solo construir (Hammer)": "Build only (Hammer)",
    "Combate": "Combat",
    "Castigo al morir": "Death penalty",
    "Recursos": "Resources",
    "Asaltos": "Raids",
    "Portales": "Portals",
    "Muy fácil": "Very easy",
    "Muy difícil": "Very hard",
    "Muchos menos": "Much less",
    "Menos": "Less",
    "Más": "More",
    "Muchos más": "Much more",
    "Máximo": "Most",
    "Ninguno": "None",
    "Construir gratis": "Free building",
    "Asaltos según cada jugador": "Raids based on each player",
    "Enemigos pasivos": "Passive enemies",
    "Sin mapa": "No map",

    // ---- mods & backups ----
    "Mundo, copias y disco": "World, backups and disk",
    "Se guarda a los 30 min de arrancar": "Saved 30 min after starting",
    "Tamaño del mundo": "World size",
    "+ {a} en copias internas de Valheim": "+ {a} in Valheim's internal backups",
    "Última copia": "Last backup",
    "Copias guardadas": "Stored backups",
    "Disco libre": "Free disk",
    "Valheim guarda el mundo solo cada 30 minutos. Las copias de seguridad copian ese último guardado.":
      "Valheim only saves the world every 30 minutes. Backups copy that last save.",
    "Copias de seguridad del mundo": "World backups",
    "Hacer copia ahora": "Back up now",
    "Archivo": "File",
    "Fecha": "Date",
    "Tamaño": "Size",
    "Restaurar para el servidor, guarda el mundo actual como «worlds_local.antes-de-restaurar-…» (por si acaso) y arranca con la copia elegida. Las copias están en Valheim/data/config/backups.":
      "Restoring stops the server, keeps the current world as «worlds_local.antes-de-restaurar-…» (just in case) and starts with the chosen backup. Backups are stored in data/config/backups.",
    "Descargar": "Download",
    "Restaurar": "Restore",
    "Aún no hay copias. Se crean automáticamente cuando ya existe un mundo.": "No backups yet. They are created automatically once a world exists.",
    "Creando copia": "Creating backup",
    "Copia creada: {a}": "Backup created: {a}",
    "Copia borrada.": "Backup deleted.",
    "Restaurando: parando el servidor y guardando el mundo actual… (puede tardar hasta 2 minutos)": "Restoring: stopping the server and keeping the current world… (it can take up to 2 minutes)",
    "Copia restaurada y servidor arrancando.": "Backup restored and server starting.",
    "El mundo anterior se guardó como {a}": "The previous world was kept as {a}",
    "Mods instalados": "Installed mods",
    "Subir mod (.dll o .zip)": "Upload mod (.dll or .zip)",
    "Los cambios en mods se aplican al reiniciar. ⚠️ La mayoría de mods también deben instalarlos tus amigos en su juego (con r2modman / Thunderstore Mod Manager); los marcados como «Server-side» solo hacen falta en el servidor.":
      "Mod changes apply on restart. ⚠️ Most mods must also be installed by your friends in their game (with r2modman / Thunderstore Mod Manager); those tagged «Server-side» are only needed on the server.",
    "Desactivar": "Disable",
    "Activar": "Enable",
    "activo": "enabled",
    "desactivado": "disabled",
    "Ver en Thunderstore ↗": "View on Thunderstore ↗",
    "No hay mods instalados. Búscalos abajo o sube uno.": "No mods installed. Search for them below or upload one.",
    "Mod activado.": "Mod enabled.",
    "Mod desactivado.": "Mod disabled.",
    "Mod eliminado.": "Mod deleted.",
    "Subiendo {a}": "Uploading {a}",
    "Instalado: {a}": "Installed: {a}",
    "Reinicia el servidor para cargarlo.": "Restart the server to load it.",
    "Buscar mods en Thunderstore": "Search mods on Thunderstore",
    "Ej: plant everything, craft from containers, valheim plus": "E.g.: plant everything, craft from containers, valheim plus",
    "Todas las categorías": "All categories",
    "Buscando… (la primera vez descarga el catálogo de Thunderstore, puede tardar ~30 s)": "Searching… (the first time it downloads the Thunderstore catalog, it can take ~30 s)",
    "{a} mods encontrados (mostrando los 60 más descargados) · catálogo del {b}": "{a} mods found (showing the 60 most downloaded) · catalog from {b}",
    "{a} mods encontrados · catálogo del {b}": "{a} mods found · catalog from {b}",
    "{a} · por {b}": "{a} · by {b}",
    "+ {a} dependencias": "+ {a} dependencies",
    "Ver ↗": "View ↗",
    "Instalado": "Installed",
    "Instalar": "Install",
    "Instalando": "Installing",
    "Configuración de mods (.cfg)": "Mod configuration (.cfg)",
    "— elige un archivo —": "— pick a file —",
    "Los archivos .cfg aparecen después de arrancar el servidor con el mod instalado.": "The .cfg files appear after starting the server with the mod installed.",
    "Configuración guardada. Reinicia para aplicarla.": "Configuration saved. Restart to apply it.",

    // ---- console ----
    "Consola del servidor": "Server console",
    "Conectado al servidor por RCON.": "Connected to the server via RCON.",
    "RCON no disponible: el servidor está arrancando o el mod RCON no está cargado.": "RCON unavailable: the server is starting or the RCON mod is not loaded.",
    "Info": "Info",
    "Estadísticas": "Stats",
    "Día y hora": "Day and time",
    "Admins": "Admins",
    "Guardar mundo": "Save world",
    "Jefes y llaves": "Bosses and keys",
    "Lista de eventos": "Event list",
    "Evento actual": "Current event",
    "Parar evento": "Stop event",
    "Mensajes": "Messages",
    "Chat: say …": "Chat: say …",
    "Aviso en pantalla …": "On-screen message …",
    "Escribe un comando y pulsa Enter (ej: say Hola vikingos)": "Type a command and press Enter (e.g. say Hello vikings)",
    "Flechas ↑ ↓ para repetir comandos anteriores. Los que llevan «…» rellenan el cuadro para que completes el texto. Todos los comandos:":
      "Arrows ↑ ↓ repeat previous commands. Buttons with «…» fill the box so you can complete the text. All commands:",
    "lista completa ↗": "full list ↗",
    ". Los comandos de jugador usan el SteamID (está en cada tarjeta de 👥 Jugadores).": ". Player commands use the SteamID (shown on each card in 👥 Players).",
    "Comandos dentro del juego": "In-game commands",
    "Valheim no permite cambiar la hora o el clima desde fuera del juego. Si eres admin (añádete en 👥 Jugadores), pulsa":
      "Valheim does not allow changing the time or weather from outside the game. If you are an admin (add yourself in 👥 Players), press",
    "en el juego para abrir la consola:": "in the game to open the console:",
    "kick Nombre": "kick Name",
    "ban Nombre": "ban Name",
    "unban Nombre": "unban Name",
    "Expulsar a un jugador": "Kick a player",
    "Banear / desbanear": "Ban / unban",
    "Guardar el mundo ahora": "Save the world now",
    "Pasar la noche": "Skip the night",
    "Activa comandos de trucos (luego:": "Enables cheat commands (then:",
    "mediodía,": "noon,",
    "despejado,": "clear weather,",
    "spawn Objeto": "spawn Item",
    "…). Solo funcionan en tu propio juego si eres el anfitrión, no en un servidor dedicado.": "…). They only work in your own game if you are the host, not on a dedicated server.",
    "Registro del servidor": "Server log",
    "(pulsa para abrir)": "(click to open)",
    "Filtrar (ej: error, join code, ZDOID…)": "Filter (e.g. error, join code, ZDOID…)",
    "Seguir al final": "Follow the end",
    "Ocultar ruido": "Hide noise",

    // ---- default kits ----
    "Principiante": "Starter",
    "Construcción": "Building",
    "Minería": "Mining",

    // ---- in-game messages (server.js, PANEL_LANG) ----
    "El servidor se reinicia en {a} min. ¡Poneos a salvo!": "The server restarts in {a} min. Get to safety!",
    "El servidor se reinicia en 10 segundos": "The server restarts in 10 seconds",
    "Reinicio cancelado": "Restart cancelled",

    // ---- server errors ----
    "Acción no válida": "Invalid action",
    "Archivo demasiado grande": "File too large",
    "Caracteres no válidos": "Invalid characters",
    "Cofre no válido": "Invalid chest",
    "Contraseña RCON incorrecta": "Wrong RCON password",
    "Criatura no válida": "Invalid creature",
    "Datos no válidos": "Invalid data",
    "Destino no válido": "Invalid destination",
    "El nombre del mundo solo puede tener letras, números, - y _": "The world name can only contain letters, numbers, - and _",
    "El nombre del servidor no puede estar vacío": "The server name cannot be empty",
    "El servidor no responde por RCON (¿está arrancando o falta el mod?)": "The server does not answer over RCON (is it starting, or is the mod missing?)",
    "Escribe un comando": "Type a command",
    "Ese jugador no está conectado": "That player is not online",
    "Ese punto está fuera del mundo": "That point is outside the world",
    "Esta copia no tiene el formato esperado": "This backup does not have the expected format",
    "Evento no válido": "Invalid event",
    "Formato no válido": "Invalid format",
    "Jefe no válido": "Invalid boss",
    "Jugador no válido": "Invalid player",
    "Kit no encontrado": "Kit not found",
    "La contraseña debe tener al menos 5 caracteres": "The password must be at least 5 characters long",
    "La contraseña no puede estar contenida en el nombre del servidor": "The password cannot be part of the server name",
    "Lista no válida": "Invalid list",
    "No se encontró {a} en Thunderstore": "{a} was not found on Thunderstore",
    "No se pudo conectar por RCON: {a}": "Could not connect over RCON: {a}",
    "No se pudo descargar {a}": "Could not download {a}",
    "Nombre de archivo no válido": "Invalid file name",
    "Punto no válido": "Invalid point",
    "RCON sin configurar": "RCON not configured",
    "Solo archivos .cfg": "Only .cfg files",
    "Solo se aceptan archivos .dll o .zip": "Only .dll or .zip files are accepted",
    "Thunderstore respondió {a}": "Thunderstore answered {a}",
    "Todavía no hay ningún mundo creado": "No world has been created yet",
    "Ya hay un reinicio programado": "A restart is already scheduled",
    "Lugar": "Place",

    // ---- login page ----
    "Contraseña del panel": "Panel password",
    "Entrar": "Log in",
    "Demasiados intentos. Espera un minuto.": "Too many attempts. Wait a minute.",
    "Inicia sesión": "Log in",
  };

  // ---------- translation engine ----------
  const TEMPLATES = [];
  for (const [k, v] of Object.entries(EN)) {
    if (!/\{\w+\}/.test(k) || k === "{nombre}") continue;
    const names = [];
    const src = k.split(/\{(\w+)\}/).map((part, i) => (i % 2 ? (names.push(part), "([^\\n]+?)") : part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))).join("");
    TEMPLATES.push([new RegExp("^" + src + "$"), names, v]);
  }
  const fill = (s, p) => (p ? String(s).replace(/\{(\w+)\}/g, (m, k) => (k in p ? p[k] : m)) : s);
  const one = (s) => {
    if (EN[s] !== undefined) return EN[s];
    for (const [re, names, v] of TEMPLATES) {
      const m = s.match(re);
      if (m) return v.replace(/\{(\w+)\}/g, (x, k) => { const i = names.indexOf(k); if (i < 0) return x; return translate(m[i + 1], "en"); });
    }
    return null;
  };
  const cache = new Map();
  // Spanish text -> language `lang` ("es" returns it unchanged)
  function translate(s, lang) {
    if (s === null || s === undefined) return s;
    s = String(s);
    if (lang !== "en" || !s.trim()) return s;
    if (cache.has(s)) return cache.get(s);
    let out = s.includes("\n") ? s.split("\n").map((l) => translate(l, lang)).join("\n") : one(s);
    if (out === null) {
      // Keep leading emoji/symbols and then trailing "…:." outside of the lookup
      const pre = s.match(/^[^\p{L}\p{N}¿¡«({+]*/u)[0], rest = s.slice(pre.length);
      const suf = rest.match(/[\s…:.]*$/)[0], core = rest.slice(0, rest.length - suf.length);
      let r = pre && rest ? one(rest) : null;
      if (r !== null) out = pre + r;
      else if (core && (r = one(core)) !== null) out = pre + r + suf;
      else out = s;
    }
    if (cache.size > 5000) cache.clear();
    cache.set(s, out);
    return out;
  }
  // "FineWood" -> "Fine Wood" (English item names come from the game's internal names)
  const humanize = (p) => String(p).replace(/_/g, " ").replace(/([a-z])([A-Z0-9])/g, "$1 $2").replace(/\s+/g, " ").trim();

  const api = { EN, translate, humanize, fill };
  if (typeof module !== "undefined") { module.exports = api; return; }

  // ---------- browser ----------
  const cookieLang = (document.cookie.match(/(?:^|;\s*)vhlang=(es|en)/) || [])[1];
  let saved = null;
  try { saved = localStorage.getItem("vhLang"); } catch {}
  const lang = saved === "es" || saved === "en" ? saved : cookieLang || (/^es\b/i.test(navigator.language || "") ? "es" : "en");
  const LOCALE = lang === "en" ? "en-GB" : "es-ES";
  document.documentElement.lang = lang;
  const t = (s, params) => fill(translate(s, lang), params);

  function setLang(l) {
    try { localStorage.setItem("vhLang", l); } catch {}
    document.cookie = `vhlang=${l}; Path=/; Max-Age=31536000; SameSite=Strict`;
    location.reload();
  }

  // Elements whose content is data, not UI text
  const SKIP = "script,style,[data-no-i18n],#logbox,#conOut,.desc";
  const ATTRS = ["title", "placeholder", "label"];
  function trText(n) {
    const v = n.nodeValue;
    if (!v || !v.trim()) return;
    const p = n.parentElement;
    if (!p || p.closest(SKIP + ",textarea")) return; // textarea content is user text (attributes are translated)
    const core = v.trim().replace(/\s+/g, " ");
    const out = translate(core, lang);
    if (out !== core) n.nodeValue = v.match(/^\s*/)[0] + out + v.match(/\s*$/)[0];
  }
  function trAttrs(el) {
    if (el.closest(SKIP)) return;
    for (const a of ATTRS) {
      const v = el.getAttribute(a);
      if (v && v.trim()) { const out = translate(v, lang); if (out !== v) el.setAttribute(a, out); }
    }
  }
  function trTree(root) {
    if (root.nodeType === 3) return trText(root);
    if (root.nodeType !== 1) return;
    trAttrs(root);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    for (let n = w.nextNode(); n; n = w.nextNode()) n.nodeType === 3 ? trText(n) : trAttrs(n);
  }
  function start() {
    // Language picker in the header (any element with id="langSel")
    const sel = document.getElementById("langSel");
    if (sel) { sel.value = lang; sel.addEventListener("change", () => setLang(sel.value)); }
    if (lang === "es") return;
    document.title = translate(document.title, lang);
    trTree(document.body);
    new MutationObserver((list) => {
      for (const m of list) {
        if (m.type === "characterData") trText(m.target);
        else if (m.type === "attributes") trAttrs(m.target);
        else m.addedNodes.forEach(trTree);
      }
    }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  Object.assign(api, { lang, LOCALE, t, setLang, start });
  window.I18N = api;
  window.t = t;
  window.LOCALE = LOCALE;
})();
