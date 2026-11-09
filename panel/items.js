// Catálogo para el panel: nombre interno del juego (prefab) → nombre en español.
// Lo usan el buscador de objetos, los kits, la limpieza de objetos tirados y el selector de criaturas.
(function () {
  const ITEMS = [
    // Materiales
    ["Wood", "Madera", "Materiales"], ["FineWood", "Madera fina", "Materiales"], ["RoundLog", "Madera de núcleo", "Materiales"],
    ["ElderBark", "Corteza antigua", "Materiales"], ["YggdrasilWood", "Madera de Yggdrasil", "Materiales"], ["Blackwood", "Madera negra", "Materiales"],
    ["Stone", "Piedra", "Materiales"], ["Flint", "Pedernal", "Materiales"], ["Resin", "Resina", "Materiales"], ["LeatherScraps", "Retales de cuero", "Materiales"],
    ["DeerHide", "Piel de ciervo", "Materiales"], ["TrollHide", "Piel de troll", "Materiales"], ["WolfPelt", "Piel de lobo", "Materiales"],
    ["LoxPelt", "Piel de lox", "Materiales"], ["ScaleHide", "Piel escamosa", "Materiales"], ["Feathers", "Plumas", "Materiales"],
    ["BoneFragments", "Fragmentos de hueso", "Materiales"], ["GreydwarfEye", "Ojo de greydwarf", "Materiales"], ["SurtlingCore", "Núcleo de surtling", "Materiales"],
    ["Coal", "Carbón", "Materiales"], ["Guck", "Pringue", "Materiales"], ["Chitin", "Quitina", "Materiales"], ["Obsidian", "Obsidiana", "Materiales"],
    ["Crystal", "Cristal", "Materiales"], ["Needle", "Aguja", "Materiales"], ["Tar", "Brea", "Materiales"], ["LinenThread", "Hilo de lino", "Materiales"],
    ["Flax", "Lino", "Materiales"], ["Barley", "Cebada", "Materiales"], ["Thistle", "Cardo", "Materiales"], ["Dandelion", "Diente de león", "Materiales"],
    ["Ectoplasm", "Ectoplasma", "Materiales"], ["Entrails", "Tripas", "Materiales"], ["Bilebag", "Bolsa de bilis", "Materiales"],
    ["Sap", "Savia", "Materiales"], ["Softtissue", "Tejido blando", "Materiales"], ["Carapace", "Caparazón", "Materiales"],
    ["Mandible", "Mandíbula", "Materiales"], ["Eitr", "Eitr refinado", "Materiales"], ["BlackCore", "Núcleo negro", "Materiales"],
    ["Coins", "Monedas", "Materiales"], ["Amber", "Ámbar", "Materiales"], ["AmberPearl", "Perla de ámbar", "Materiales"], ["Ruby", "Rubí", "Materiales"],
    ["SilverNecklace", "Collar de plata", "Materiales"], ["Wishbone", "Hueso de los deseos", "Materiales"],
    // Metales
    ["CopperOre", "Mena de cobre", "Metales"], ["Copper", "Cobre", "Metales"], ["TinOre", "Mena de estaño", "Metales"], ["Tin", "Estaño", "Metales"],
    ["Bronze", "Bronce", "Metales"], ["BronzeNails", "Clavos de bronce", "Metales"], ["IronScrap", "Chatarra de hierro", "Metales"], ["Iron", "Hierro", "Metales"],
    ["IronNails", "Clavos de hierro", "Metales"], ["SilverOre", "Mena de plata", "Metales"], ["Silver", "Plata", "Metales"],
    ["BlackMetalScrap", "Chatarra de metal negro", "Metales"], ["BlackMetal", "Metal negro", "Metales"], ["FlametalOre", "Mena de flametal", "Metales"],
    ["Flametal", "Flametal", "Metales"], ["CopperScrap", "Chatarra de cobre", "Metales"],
    // Herramientas
    ["Hammer", "Martillo", "Herramientas"], ["Hoe", "Azada", "Herramientas"], ["Cultivator", "Cultivador", "Herramientas"],
    ["FishingRod", "Caña de pescar", "Herramientas"], ["FishingBait", "Cebo", "Herramientas"], ["Tankard", "Jarra", "Herramientas"],
    ["AxeStone", "Hacha de piedra", "Herramientas"], ["AxeFlint", "Hacha de pedernal", "Herramientas"], ["AxeBronze", "Hacha de bronce", "Herramientas"],
    ["AxeIron", "Hacha de hierro", "Herramientas"], ["AxeBlackMetal", "Hacha de metal negro", "Herramientas"], ["AxeJotunBane", "Perdición de Jotun", "Herramientas"],
    ["PickaxeAntler", "Pico de asta", "Herramientas"], ["PickaxeBronze", "Pico de bronce", "Herramientas"], ["PickaxeIron", "Pico de hierro", "Herramientas"],
    ["PickaxeBlackMetal", "Pico de metal negro", "Herramientas"], ["Torch", "Antorcha", "Herramientas"], ["Lantern", "Farol", "Herramientas"],
    ["Demister", "Wisplight (luz contra la niebla)", "Herramientas"], ["BeltStrength", "Cinturón de fuerza (Megingjord)", "Herramientas"],
    // Armas
    ["Club", "Garrote", "Armas"], ["SwordBronze", "Espada de bronce", "Armas"], ["SwordIron", "Espada de hierro", "Armas"], ["SwordSilver", "Espada de plata", "Armas"],
    ["SwordBlackmetal", "Espada de metal negro", "Armas"], ["SwordMistwalker", "Mistwalker", "Armas"], ["KnifeFlint", "Cuchillo de pedernal", "Armas"],
    ["KnifeCopper", "Cuchillo de cobre", "Armas"], ["KnifeSilver", "Daga de plata", "Armas"], ["KnifeBlackMetal", "Cuchillo de metal negro", "Armas"],
    ["MaceBronze", "Maza de bronce", "Armas"], ["MaceIron", "Maza de hierro", "Armas"], ["MaceSilver", "Maza de plata (Frostner)", "Armas"],
    ["MaceNeedle", "Porra de pinchos", "Armas"], ["SpearFlint", "Lanza de pedernal", "Armas"], ["SpearBronze", "Lanza de bronce", "Armas"],
    ["SpearElderbark", "Lanza antigua", "Armas"], ["SpearWolfFang", "Lanza de colmillo", "Armas"], ["SpearChitin", "Arpón de quitina", "Armas"],
    ["AtgeirBronze", "Atgeir de bronce", "Armas"], ["AtgeirIron", "Atgeir de hierro", "Armas"], ["AtgeirBlackmetal", "Atgeir de metal negro", "Armas"],
    ["Battleaxe", "Hacha de batalla", "Armas"], ["BattleaxeCrystal", "Hacha de cristal", "Armas"], ["SledgeStagbreaker", "Mazo Stagbreaker", "Armas"],
    ["SledgeIron", "Mazo de hierro", "Armas"], ["Bow", "Arco tosco", "Armas"], ["BowFineWood", "Arco de madera fina", "Armas"],
    ["BowHuntsman", "Arco del cazador", "Armas"], ["BowDraugrFang", "Colmillo de draugr", "Armas"], ["BowSpineSnap", "Arco Spinesnap", "Armas"],
    ["CrossbowArbalest", "Ballesta", "Armas"], ["ArrowWood", "Flecha de madera", "Armas"], ["ArrowFire", "Flecha de fuego", "Armas"],
    ["ArrowFlint", "Flecha de pedernal", "Armas"], ["ArrowBronze", "Flecha de bronce", "Armas"], ["ArrowIron", "Flecha de hierro", "Armas"],
    ["ArrowObsidian", "Flecha de obsidiana", "Armas"], ["ArrowPoison", "Flecha venenosa", "Armas"], ["ArrowSilver", "Flecha de plata", "Armas"],
    ["ArrowFrost", "Flecha de hielo", "Armas"], ["ArrowNeedle", "Flecha de aguja", "Armas"], ["BoltBlackmetal", "Virote de metal negro", "Armas"],
    ["BombOoze", "Bomba de légamo", "Armas"],
    // Escudos y armaduras
    ["ShieldWood", "Escudo de madera", "Armaduras"], ["ShieldWoodTower", "Escudo torre de madera", "Armaduras"], ["ShieldBronzeBuckler", "Rodela de bronce", "Armaduras"],
    ["ShieldBanded", "Escudo con bandas", "Armaduras"], ["ShieldIronTower", "Escudo torre de hierro", "Armaduras"], ["ShieldSilver", "Escudo de plata", "Armaduras"],
    ["ShieldBlackmetal", "Escudo de metal negro", "Armaduras"], ["ShieldSerpentscale", "Escudo de escamas de serpiente", "Armaduras"],
    ["HelmetLeather", "Casco de cuero", "Armaduras"], ["ArmorLeatherChest", "Túnica de cuero", "Armaduras"], ["ArmorLeatherLegs", "Pantalón de cuero", "Armaduras"],
    ["HelmetTrollLeather", "Capucha de troll", "Armaduras"], ["ArmorTrollLeatherChest", "Túnica de troll", "Armaduras"], ["ArmorTrollLeatherLegs", "Pantalón de troll", "Armaduras"],
    ["HelmetBronze", "Casco de bronce", "Armaduras"], ["ArmorBronzeChest", "Peto de bronce", "Armaduras"], ["ArmorBronzeLegs", "Grebas de bronce", "Armaduras"],
    ["HelmetIron", "Casco de hierro", "Armaduras"], ["ArmorIronChest", "Peto de hierro", "Armaduras"], ["ArmorIronLegs", "Grebas de hierro", "Armaduras"],
    ["HelmetDrake", "Casco de draco", "Armaduras"], ["ArmorWolfChest", "Peto de lobo", "Armaduras"], ["ArmorWolfLegs", "Grebas de lobo", "Armaduras"],
    ["HelmetPadded", "Casco acolchado", "Armaduras"], ["ArmorPaddedCuirass", "Coraza acolchada", "Armaduras"], ["ArmorPaddedGreaves", "Grebas acolchadas", "Armaduras"],
    ["HelmetRoot", "Máscara de raíz", "Armaduras"], ["ArmorRootChest", "Peto de raíz", "Armaduras"], ["ArmorRootLegs", "Grebas de raíz", "Armaduras"],
    ["CapeDeerHide", "Capa de piel de ciervo", "Armaduras"], ["CapeTrollHide", "Capa de troll", "Armaduras"], ["CapeWolf", "Capa de lobo", "Armaduras"],
    ["CapeLox", "Capa de lox", "Armaduras"], ["CapeLinen", "Capa de lino", "Armaduras"], ["CapeFeather", "Capa de plumas", "Armaduras"],
    // Comida
    ["Raspberry", "Frambuesas", "Comida"], ["Blueberries", "Arándanos", "Comida"], ["Cloudberry", "Moras de los pantanos", "Comida"],
    ["Mushroom", "Seta", "Comida"], ["MushroomYellow", "Seta amarilla", "Comida"], ["Honey", "Miel", "Comida"], ["Carrot", "Zanahoria", "Comida"],
    ["Turnip", "Nabo", "Comida"], ["Onion", "Cebolla", "Comida"], ["CookedMeat", "Carne de jabalí asada", "Comida"], ["CookedDeerMeat", "Carne de ciervo asada", "Comida"],
    ["CookedLoxMeat", "Carne de lox asada", "Comida"], ["CookedWolfMeat", "Carne de lobo asada", "Comida"], ["FishCooked", "Pescado asado", "Comida"],
    ["NeckTailGrilled", "Cola de neck asada", "Comida"], ["SerpentMeatCooked", "Carne de serpiente asada", "Comida"], ["QueensJam", "Mermelada de la reina", "Comida"],
    ["CarrotSoup", "Sopa de zanahoria", "Comida"], ["DeerStew", "Estofado de ciervo", "Comida"], ["MinceMeatSauce", "Salsa de carne picada", "Comida"],
    ["SausageS", "Salchichas", "Comida"], ["TurnipStew", "Estofado de nabo", "Comida"], ["BlackSoup", "Sopa negra", "Comida"],
    ["SerpentStew", "Estofado de serpiente", "Comida"], ["WolfJerky", "Cecina de lobo", "Comida"], ["Eyescream", "Helado de ojos", "Comida"],
    ["OnionSoup", "Sopa de cebolla", "Comida"], ["BloodPudding", "Morcilla", "Comida"], ["Bread", "Pan", "Comida"], ["FishWraps", "Rollitos de pescado", "Comida"],
    ["LoxPie", "Pastel de lox", "Comida"], ["MeatPlatter", "Bandeja de carne", "Comida"], ["HoneyGlazedChicken", "Pollo glaseado con miel", "Comida"],
    ["MisthareSupreme", "Liebre de la niebla suprema", "Comida"], ["Salad", "Ensalada", "Comida"], ["YggdrasilPorridge", "Gachas de Yggdrasil", "Comida"],
    ["SeekerAspic", "Áspic de buscador", "Comida"], ["MagicallyStuffedShroom", "Seta rellena mágica", "Comida"],
    // Pociones
    ["MeadHealthMinor", "Hidromiel de salud menor", "Pociones"], ["MeadHealthMedium", "Hidromiel de salud media", "Pociones"],
    ["MeadHealthMajor", "Hidromiel de salud mayor", "Pociones"], ["MeadStaminaMinor", "Hidromiel de aguante menor", "Pociones"],
    ["MeadStaminaMedium", "Hidromiel de aguante medio", "Pociones"], ["MeadPoisonResist", "Hidromiel contra veneno", "Pociones"],
    ["MeadFrostResist", "Hidromiel contra frío", "Pociones"], ["MeadTasty", "Hidromiel sabroso", "Pociones"], ["MeadEitrMinor", "Hidromiel de eitr menor", "Pociones"],
    ["BarleyWine", "Vino de cebada (contra fuego)", "Pociones"],
    // Semillas
    ["CarrotSeeds", "Semillas de zanahoria", "Semillas"], ["TurnipSeeds", "Semillas de nabo", "Semillas"], ["OnionSeeds", "Semillas de cebolla", "Semillas"],
    ["BeechSeeds", "Semillas de haya", "Semillas"], ["PineCone", "Piña de pino", "Semillas"], ["FirCone", "Piña de abeto", "Semillas"],
    ["BirchSeeds", "Semillas de abedul", "Semillas"], ["Acorn", "Bellota", "Semillas"], ["AncientSeed", "Semilla antigua", "Semillas"],
    // Jefes y trofeos
    ["TrophyEikthyr", "Trofeo de Eikthyr", "Jefes"], ["HardAntler", "Asta dura", "Jefes"], ["TrophyTheElder", "Trofeo del Anciano", "Jefes"],
    ["CryptKey", "Llave de la cripta", "Jefes"], ["TrophyBonemass", "Trofeo de Bonemass", "Jefes"], ["Wishbone", "Hueso de los deseos", "Jefes"],
    ["TrophyDragonQueen", "Trofeo de Moder", "Jefes"], ["DragonTear", "Lágrima de dragón", "Jefes"], ["DragonEgg", "Huevo de dragón", "Jefes"],
    ["TrophyGoblinKing", "Trofeo de Yagluth", "Jefes"], ["YagluthDrop", "Fragmento de antorcha", "Jefes"], ["TrophySeekerQueen", "Trofeo de la Reina", "Jefes"],
    ["DvergrKey", "Llave dvergr", "Jefes"], ["GoblinTotem", "Tótem fuling", "Jefes"], ["WitheredBone", "Hueso marchito", "Jefes"],
    ["AncientSeed", "Semilla antigua", "Jefes"], ["TrophyDeer", "Trofeo de ciervo", "Jefes"], ["TrophyBoar", "Trofeo de jabalí", "Jefes"],
  ];
  // Quitar duplicados (algunos objetos aparecen en dos categorías)
  const seen = new Set();
  const items = ITEMS.filter(([p]) => !seen.has(p) && seen.add(p)).map(([prefab, name, cat]) => ({ prefab, name, cat }));

  const CREATURES = [
    ["Boar", "Jabalí"], ["Deer", "Ciervo"], ["Neck", "Neck"], ["Greyling", "Greyling"], ["Greydwarf", "Greydwarf"], ["Greydwarf_Elite", "Greydwarf bruto"],
    ["Greydwarf_Shaman", "Greydwarf chamán"], ["Troll", "Troll"], ["Skeleton", "Esqueleto"], ["Skeleton_Poison", "Esqueleto venenoso"], ["Ghost", "Fantasma"],
    ["Draugr", "Draugr"], ["Draugr_Elite", "Draugr élite"], ["Blob", "Légamo"], ["BlobElite", "Légamo grande"], ["Leech", "Sanguijuela"],
    ["Surtling", "Surtling"], ["Wraith", "Espectro"], ["Abomination", "Abominación"], ["Wolf", "Lobo"], ["Hatchling", "Draco"], ["StoneGolem", "Gólem de piedra"],
    ["Fenring", "Fenring"], ["Ulv", "Ulv"], ["Bat", "Murciélago"], ["Lox", "Lox"], ["Goblin", "Fuling"], ["GoblinArcher", "Fuling arquero"],
    ["GoblinBrute", "Fuling berserker"], ["GoblinShaman", "Fuling chamán"], ["Deathsquito", "Mosquito de la muerte"], ["Serpent", "Serpiente marina"],
    ["Seeker", "Buscador"], ["SeekerBrute", "Buscador soldado"], ["Tick", "Garrapata"], ["Gjall", "Gjall"], ["Dverger", "Dvergr"], ["Hare", "Liebre de la niebla"],
    ["Hen", "Gallina"], ["Chicken", "Pollito"], ["Asksvin", "Asksvin"], ["Morgen", "Morgen"], ["Charred_Melee", "Carbonizado guerrero"], ["Volture", "Buitre"],
  ];
  const BOSSES = [["Eikthyr", "Eikthyr"], ["gd_king", "El Anciano"], ["Bonemass", "Bonemass"], ["Dragon", "Moder"], ["GoblinKing", "Yagluth"],
    ["SeekerQueen", "La Reina"], ["Fader", "Fader"]];

  const data = {
    items,
    creatures: CREATURES.map(([prefab, name]) => ({ prefab, name })),
    bosses: BOSSES.map(([prefab, name]) => ({ prefab, name })),
  };
  if (typeof module !== "undefined") module.exports = data;
  else window.VH = data;
})();
