"""
Reference data endpoints.
Provides access to mineral database and information.
"""

from fastapi import APIRouter, HTTPException
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

# Complete mineral reference database (30 minerals)
MINERALS_DATABASE = {
    "Quartz": {
        "name": "Quartz",
        "chemical_formula": "SiO2",
        "hardness": "7",
        "color": "Colorless, white, gray, pink, purple, brown",
        "luster": "Vitreous",
        "crystal_system": "Hexagonal (Trigonal)",
        "description": "Silicon dioxide mineral, the most abundant mineral in Earth's continental crust.",
        "uses": ["Electronics", "Glass", "Gemstones", "Abrasives", "Construction"],
    },
    "Feldspar": {
        "name": "Feldspar",
        "chemical_formula": "KAlSi3O8 - NaAlSi3O8 - CaAl2Si2O8",
        "hardness": "6-6.5",
        "color": "White, pink, blue, yellow, gray",
        "luster": "Vitreous to pearly",
        "crystal_system": "Triclinic, Monoclinic",
        "description": "The most abundant mineral group in Earth's crust, comprising about 60% of crustal rocks.",
        "uses": ["Ceramics", "Glass", "Porcelain", "Construction", "Gemstones"],
    },
    "Mica": {
        "name": "Mica",
        "chemical_formula": "KAl2(AlSi3O10)(OH)2",
        "hardness": "2.5-3",
        "color": "Silver, brown, black, green, violet",
        "luster": "Vitreous to pearly",
        "crystal_system": "Monoclinic",
        "description": "Sheet silicate mineral known for perfect basal cleavage into thin, flexible sheets.",
        "uses": ["Electrical insulation", "Cosmetics", "Construction", "Paint", "Lubricants"],
    },
    "Calcite": {
        "name": "Calcite",
        "chemical_formula": "CaCO3",
        "hardness": "3",
        "color": "Colorless, white, yellow, pink, blue, green",
        "luster": "Vitreous to dull",
        "crystal_system": "Hexagonal (Trigonal)",
        "description": "Calcium carbonate mineral, primary constituent of limestone and marble.",
        "uses": ["Cement", "Construction", "Agriculture", "Pharmaceuticals", "Abrasives"],
    },
    "Hematite": {
        "name": "Hematite",
        "chemical_formula": "Fe2O3",
        "hardness": "5.5-6.5",
        "color": "Red, gray, black, brown",
        "luster": "Metallic to earthy",
        "crystal_system": "Hexagonal (Trigonal)",
        "description": "Most important iron ore mineral, known for its deep red streak color.",
        "uses": ["Iron production", "Pigment", "Polishing", "Gemstones", "Medical"],
    },
    "Magnetite": {
        "name": "Magnetite",
        "chemical_formula": "Fe3O4",
        "hardness": "5.5-6.5",
        "color": "Black, dark gray",
        "luster": "Metallic",
        "crystal_system": "Cubic (Isometric)",
        "description": "Naturally magnetic iron oxide mineral, the most magnetic naturally occurring mineral.",
        "uses": ["Iron ore", "Magnetic media", "Mining", "Water purification", "Biomedical"],
    },
    "Galena": {
        "name": "Galena",
        "chemical_formula": "PbS",
        "hardness": "2.5",
        "color": "Lead gray, silvery",
        "luster": "Metallic",
        "crystal_system": "Cubic (Isometric)",
        "description": "Primary lead ore mineral with distinctive cubic crystals and perfect cubic cleavage.",
        "uses": ["Lead production", "Silver extraction", "Batteries", "Radiation shielding"],
    },
    "Pyrite": {
        "name": "Pyrite",
        "chemical_formula": "FeS2",
        "hardness": "6-6.5",
        "color": "Brass yellow, pale gold",
        "luster": "Metallic",
        "crystal_system": "Cubic (Isometric)",
        "description": "Iron sulfide known as 'fool's gold', the most common sulfide mineral.",
        "uses": ["Sulfuric acid", "Iron source", "Jewelry", "Gold exploration indicator"],
    },
    "Chalcopyrite": {
        "name": "Chalcopyrite",
        "chemical_formula": "CuFeS2",
        "hardness": "3.5-4",
        "color": "Brass yellow, golden, iridescent tarnish",
        "luster": "Metallic",
        "crystal_system": "Tetragonal",
        "description": "Most important copper ore mineral, providing the majority of world's copper.",
        "uses": ["Copper production", "Electrical wiring", "Plumbing", "Alloys", "Semiconductors"],
    },
    "Malachite": {
        "name": "Malachite",
        "chemical_formula": "Cu2CO3(OH)2",
        "hardness": "3.5-4",
        "color": "Bright green, dark green, banded",
        "luster": "Vitreous to silky",
        "crystal_system": "Monoclinic",
        "description": "Green copper carbonate mineral known for distinctive banded patterns.",
        "uses": ["Ornamental stone", "Jewelry", "Pigment", "Copper ore", "Collecting"],
    },
    "Limonite": {
        "name": "Limonite",
        "chemical_formula": "FeO(OH)·nH2O",
        "hardness": "4-5.5",
        "color": "Yellow-brown, dark brown, black",
        "luster": "Earthy to submetallic",
        "crystal_system": "Amorphous",
        "description": "Iron oxyhydroxide mineral mixture forming characteristic yellow-brown rust color.",
        "uses": ["Iron ore", "Yellow pigment", "Water filtration", "Soil conditioner"],
    },
    "Bauxite": {
        "name": "Bauxite",
        "chemical_formula": "AlO(OH) / Al(OH)3",
        "hardness": "1-3",
        "color": "Red-brown, white, yellow, gray",
        "luster": "Earthy to dull",
        "crystal_system": "Amorphous (mixture)",
        "description": "Primary aluminum ore, formed through intense tropical weathering.",
        "uses": ["Aluminum production", "Refractory materials", "Abrasives", "Cement", "Chemicals"],
    },
    "Corundum": {
        "name": "Corundum",
        "chemical_formula": "Al2O3",
        "hardness": "9",
        "color": "Red (ruby), blue (sapphire), colorless, yellow, pink",
        "luster": "Vitreous to adamantine",
        "crystal_system": "Hexagonal (Trigonal)",
        "description": "Second hardest natural mineral, includes precious gems ruby and sapphire.",
        "uses": ["Gemstones", "Industrial abrasive", "Watch bearings", "Lasers", "Optics"],
    },
    "Diamond": {
        "name": "Diamond",
        "chemical_formula": "C",
        "hardness": "10",
        "color": "Colorless, yellow, brown, blue, pink, green",
        "luster": "Adamantine",
        "crystal_system": "Cubic (Isometric)",
        "description": "Hardest known natural material, composed of carbon atoms in a crystal structure.",
        "uses": ["Gemstones", "Cutting tools", "Polishing", "Surgical tools", "Electronics"],
    },
    "Graphite": {
        "name": "Graphite",
        "chemical_formula": "C",
        "hardness": "1-2",
        "color": "Steel gray, black",
        "luster": "Metallic, earthy",
        "crystal_system": "Hexagonal",
        "description": "Soft carbon mineral with layered structure, same element as diamond.",
        "uses": ["Pencils", "Lubricant", "Batteries", "Steel industry", "Nuclear reactors"],
    },
    "Olivine": {
        "name": "Olivine",
        "chemical_formula": "(Mg,Fe)2SiO4",
        "hardness": "6.5-7",
        "color": "Green, yellow-green, olive green",
        "luster": "Vitreous",
        "crystal_system": "Orthorhombic",
        "description": "Green silicate mineral common in Earth's upper mantle, gem variety is peridot.",
        "uses": ["Gemstone (peridot)", "Refractory materials", "CO2 sequestration", "Abrasives"],
    },
    "Amphibole": {
        "name": "Amphibole",
        "chemical_formula": "Ca2Mg5(Si8O22)(OH)2",
        "hardness": "5-6",
        "color": "Dark green, black, brown",
        "luster": "Vitreous to silky",
        "crystal_system": "Monoclinic",
        "description": "Double-chain silicate mineral group common in igneous and metamorphic rocks.",
        "uses": ["Rock identification", "Geological mapping", "Building material", "Research"],
    },
    "Pyroxene": {
        "name": "Pyroxene",
        "chemical_formula": "MgSiO3 / CaMgSi2O6",
        "hardness": "5-6",
        "color": "Dark green, black, brown, greenish-black",
        "luster": "Vitreous to dull",
        "crystal_system": "Monoclinic, Orthorhombic",
        "description": "Single-chain silicate minerals essential in mafic and ultramafic igneous rocks.",
        "uses": ["Gemstone (jadeite)", "Geological indicator", "Ceramics", "Collectors"],
    },
    "Fluorite": {
        "name": "Fluorite",
        "chemical_formula": "CaF2",
        "hardness": "4",
        "color": "Purple, blue, green, yellow, colorless, pink",
        "luster": "Vitreous",
        "crystal_system": "Cubic (Isometric)",
        "description": "Highly colorful mineral with perfect octahedral cleavage, defines Mohs hardness 4.",
        "uses": ["Chemical production", "Steel flux", "Optical lenses", "Gemstone", "Toothpaste"],
    },
    "Apatite": {
        "name": "Apatite",
        "chemical_formula": "Ca5(PO4)3(F,Cl,OH)",
        "hardness": "5",
        "color": "Green, blue, yellow, purple, colorless",
        "luster": "Vitreous to subresinous",
        "crystal_system": "Hexagonal",
        "description": "Phosphate mineral group, primary source of phosphorus for fertilizers.",
        "uses": ["Fertilizer", "Phosphoric acid", "Animal feed", "Gemstone", "Research"],
    },
    "Tourmaline": {
        "name": "Tourmaline",
        "chemical_formula": "(Na,Ca)(Al,Fe,Li,Mg,Mn)3(Al,Cr,Fe,V)6(BO3)3(Si6O18)(OH)4",
        "hardness": "7-7.5",
        "color": "Black, green, pink, blue, red, watermelon",
        "luster": "Vitreous",
        "crystal_system": "Hexagonal (Trigonal)",
        "description": "Complex borosilicate mineral known for extraordinary range of colors.",
        "uses": ["Gemstones", "Piezoelectric devices", "Pressure gauges", "Jewelry", "Collecting"],
    },
    "Beryl": {
        "name": "Beryl",
        "chemical_formula": "Be3Al2Si6O18",
        "hardness": "7.5-8",
        "color": "Green (emerald), blue (aquamarine), yellow, pink",
        "luster": "Vitreous",
        "crystal_system": "Hexagonal",
        "description": "Beryllium silicate mineral including precious gems emerald and aquamarine.",
        "uses": ["Gemstones", "Beryllium extraction", "Aerospace alloys", "X-ray windows", "Nuclear"],
    },
    "Topaz": {
        "name": "Topaz",
        "chemical_formula": "Al2SiO4(F,OH)2",
        "hardness": "8",
        "color": "Colorless, blue, yellow, orange, pink, brown",
        "luster": "Vitreous",
        "crystal_system": "Orthorhombic",
        "description": "Hard transparent silicate mineral valued as a gemstone, defines Mohs hardness 8.",
        "uses": ["Gemstone", "Jewelry", "Mohs scale reference", "Collectors", "Carvings"],
    },
    "Garnet": {
        "name": "Garnet",
        "chemical_formula": "(Mg,Fe,Mn,Ca)3(Al,Fe,Cr)2(SiO4)3",
        "hardness": "6.5-7.5",
        "color": "Red, orange, yellow, green, purple, brown, black",
        "luster": "Vitreous to resinous",
        "crystal_system": "Cubic (Isometric)",
        "description": "Silicate mineral group used as gemstones and abrasives since the Bronze Age.",
        "uses": ["Gemstone", "Industrial abrasive", "Sandblasting", "Water filtration", "Geological indicator"],
    },
    "Zircon": {
        "name": "Zircon",
        "chemical_formula": "ZrSiO4",
        "hardness": "7.5",
        "color": "Colorless, yellow, brown, red, blue, green",
        "luster": "Vitreous to adamantine",
        "crystal_system": "Tetragonal",
        "description": "One of the oldest minerals on Earth, invaluable for geological age dating.",
        "uses": ["Gemstone", "Geochronology", "Zirconium metal", "Ceramics", "Nuclear fuel cladding"],
    },
    "Talc": {
        "name": "Talc",
        "chemical_formula": "Mg3Si4O10(OH)2",
        "hardness": "1",
        "color": "White, gray, green, pale blue",
        "luster": "Waxy to pearly",
        "crystal_system": "Monoclinic (Triclinic)",
        "description": "Softest known mineral (Mohs hardness 1) with distinctive soapy feel.",
        "uses": ["Talcum powder", "Paper manufacturing", "Ceramics", "Lubricant", "Roofing"],
    },
    "Gypsum": {
        "name": "Gypsum",
        "chemical_formula": "CaSO4·2H2O",
        "hardness": "2",
        "color": "Colorless, white, gray, yellow, brown",
        "luster": "Vitreous to silky",
        "crystal_system": "Monoclinic",
        "description": "Soft sulfate mineral defining Mohs hardness 2, used widely in construction.",
        "uses": ["Drywall", "Plaster of Paris", "Cement additive", "Agriculture", "Chalk"],
    },
    "Sulfur": {
        "name": "Sulfur",
        "chemical_formula": "S",
        "hardness": "1.5-2.5",
        "color": "Bright yellow, greenish-yellow",
        "luster": "Resinous to greasy",
        "crystal_system": "Orthorhombic",
        "description": "Bright yellow native element mineral found near volcanic vents and hot springs.",
        "uses": ["Sulfuric acid", "Fertilizer", "Rubber vulcanization", "Pesticides", "Pharmaceuticals"],
    },
    "Halite": {
        "name": "Halite",
        "chemical_formula": "NaCl",
        "hardness": "2.5",
        "color": "Colorless, white, blue, orange, pink",
        "luster": "Vitreous",
        "crystal_system": "Cubic (Isometric)",
        "description": "Rock salt mineral, sodium chloride, essential for human nutrition.",
        "uses": ["Table salt", "De-icing", "Chemical industry", "Water softening", "Food preservation"],
    },
    "Azurite": {
        "name": "Azurite",
        "chemical_formula": "Cu3(CO3)2(OH)2",
        "hardness": "3.5-4",
        "color": "Deep blue, azure blue",
        "luster": "Vitreous to dull",
        "crystal_system": "Monoclinic",
        "description": "Deep blue copper carbonate mineral, historically prized as blue pigment in paintings.",
        "uses": ["Blue pigment", "Ornamental stone", "Jewelry", "Mineral collecting", "Copper indicator"],
    },
}


@router.get("/minerals")
async def get_all_minerals():
    """Get all mineral types in the database."""
    try:
        minerals = [
            {
                "id": i,
                "name": name,
                "chemical_formula": data.get("chemical_formula", "Unknown"),
                "hardness": data.get("hardness", "Unknown"),
                "color": data.get("color", "Variable"),
                "luster": data.get("luster", "Variable"),
                "crystal_system": data.get("crystal_system", "Unknown"),
                "description": data.get("description", ""),
                "uses": data.get("uses", []),
            }
            for i, (name, data) in enumerate(MINERALS_DATABASE.items(), 1)
        ]
        return {"minerals": minerals, "total": len(minerals)}
    except Exception as e:
        logger.error(f"Error fetching minerals: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch minerals")


@router.get("/minerals/{mineral_name}")
async def get_mineral_details(mineral_name: str):
    """Get detailed information about a specific mineral type."""
    if mineral_name not in MINERALS_DATABASE:
        raise HTTPException(
            status_code=404, detail=f"Mineral '{mineral_name}' not found"
        )

    return {"mineral": mineral_name, "details": MINERALS_DATABASE[mineral_name]}
