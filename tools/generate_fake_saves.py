"""
Generiert ~30 variierte Streem-Spielstände als JSON-Dateien.
Hilft beim manuellen Testen des Klassen-Vergleichs und beim
Aufspüren von Edge-Cases in CSV/HTML-Exports.

Aufruf:
    python tools/generate_fake_saves.py
    → schreibt tools/fake_saves/spieler_01.json bis _30.json

Anschließend in der App: Settings → Klassen-Vergleich → alle Dateien
hochladen.
"""
import json
import random
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = Path(__file__).resolve().parent / "fake_saves"
OUT_DIR.mkdir(exist_ok=True)

NAMES = [
    "Mia", "Lukas", "Emma", "Paul", "Sophia", "Ben", "Hannah", "Felix",
    "Lina", "Jonas", "Lea", "Tim", "Marie", "Max", "Anna", "Noah",
    "Clara", "David", "Elena", "Jakob", "Greta", "Erik", "Ida", "Leo",
    "Mara", "Niko", "Olivia", "Pia", "Quirin", "Ronja"
]

PROTAGONISTS = ["alex", "jamal", "ronja"]
PRONOUNS = ["sie/ihr", "er/ihn", "they/them", "keine"]

INTERESTS = [
    "gaming", "musik", "lifestyle", "sport", "wissenschaft", "klima",
    "humor", "politik-links", "politik-mitte", "politik-rechts",
    "feminismus", "anti-feminismus", "verschwoerung", "true-crime", "hass"
]

GUILDS_POOL = ["gaming_nord", "lese_runde", "echte_werte"]
PARTY_IDS = ["p_zukunft", "p_buerger", "p_alt", "p_heimat"]

DM_THREADS = ["dm_lea", "dm_finn", "dm_marc", "dm_mira", "dm_lara",
              "dm_tariq", "dm_sophia", "dm_sara", "dm_noah", "dm_streem",
              "dm_jule", "dm_ana", "dm_moritz"]


def rnd_interests(profile_bias):
    """profile_bias ist ein dict {tag: mean}."""
    out = {}
    for t in INTERESTS:
        base = profile_bias.get(t, 0.05)
        v = max(0.0, min(1.0, random.gauss(base, 0.1)))
        out[t] = round(v, 3)
    return out


def rnd_action(week):
    types = ["like", "comment", "angry_comment", "share", "follow", "mute", "tw_view", "tw_skip"]
    return {
        "postId": f"p{random.randint(1, 200):03d}",
        "type": random.choice(types),
        "week": week,
        "ts": int(time.time() * 1000)
    }


def gen_history(weeks, intensity):
    """intensity 0.2 = ruhig, 1.0 = aktiv."""
    out = []
    for w in range(weeks):
        n = max(2, int(random.gauss(8 * intensity, 3)))
        actions = [rnd_action(w) for _ in range(n)]
        out.append({
            "week": w,
            "actions": actions,
            "feedSeen": [f"p{random.randint(1, 200):03d}" for _ in range(10)],
            "profileSnapshot": {}  # vereinfacht
        })
    return out


def gen_one(idx, archetype):
    """archetype: 'aware', 'driven', 'rabbithole', 'allyship', 'crusader',
       'guarded', 'influencer', 'nerd', 'finn_lost', 'finn_saved'."""
    name = NAMES[idx % len(NAMES)] + (f" {idx // len(NAMES) + 1}" if idx >= len(NAMES) else "")
    protag = random.choice(PROTAGONISTS)
    pronoun = random.choice(PRONOUNS)
    bio_options = [
        "Hier um zu schauen.",
        "Greifshafen, Klasse 12, schreibt jetzt selber.",
        "Bio? Brauchst du nicht.",
        ""
    ]
    bio = random.choice(bio_options)

    # Archetyp-spezifische Defaults.
    profile_bias = {}
    political_lean = 0.0
    guilds = []
    npc_arcs = {"lea_close": 0, "finn_path": 0, "mira_close": 0, "self_aware": 0}
    dm_replies = {}
    ending = archetype

    if archetype == "rabbithole":
        profile_bias = {"verschwoerung": 0.55, "politik-rechts": 0.65, "hass": 0.3}
        political_lean = 0.65
        guilds = ["echte_werte"]
    elif archetype == "allyship":
        profile_bias = {"feminismus": 0.55, "politik-links": 0.5, "klima": 0.4}
        political_lean = -0.4
        npc_arcs["mira_close"] = 0.5
        dm_replies["dm_mira"] = {"15": {"id": "mira_15_support"}}
        dm_replies["dm_lara"] = {"24": {"id": "lara_24_solidarity"}}
    elif archetype == "aware":
        profile_bias = {"politik-mitte": 0.3, "humor": 0.4}
        political_lean = 0.0
        npc_arcs["lea_close"] = 0.7
        npc_arcs["self_aware"] = 1
        dm_replies["dm_lea"] = {"14": {"id": "lea_14_open"}}
    elif archetype == "finn_saved":
        profile_bias = {"gaming": 0.5, "humor": 0.4, "feminismus": 0.2}
        npc_arcs["finn_path"] = -3
        dm_replies["dm_finn"] = {"8": {"id": "finn_8_pushback"}, "17": {"id": "finn_17_warn"}}
    elif archetype == "finn_lost":
        profile_bias = {"gaming": 0.4, "anti-feminismus": 0.4, "politik-rechts": 0.4}
        npc_arcs["finn_path"] = 3
        dm_replies["dm_finn"] = {"8": {"id": "finn_8_agree"}, "17": {"id": "finn_17_join"}}
    elif archetype == "crusader":
        profile_bias = {"politik-links": 0.55, "klima": 0.5}
        political_lean = -0.55
    elif archetype == "guarded":
        profile_bias = {"lifestyle": 0.35, "wissenschaft": 0.3}
    elif archetype == "influencer":
        profile_bias = {"lifestyle": 0.5, "humor": 0.45, "musik": 0.4}
    elif archetype == "nerd":
        profile_bias = {"wissenschaft": 0.6, "klima": 0.4}
        guilds = ["lese_runde"]
    else:  # driven
        profile_bias = {"lifestyle": 0.3, "humor": 0.35}

    interests = rnd_interests(profile_bias)
    voted = random.choice(PARTY_IDS + [None] * 2)

    bookmarks = {}
    for _ in range(random.randint(0, 4)):
        pid = f"p{random.randint(1, 200):03d}"
        bookmarks[pid] = {
            "week": random.randint(2, 25),
            "text": f"Test-Lesezeichen Post {pid}",
            "author": "char_lea",
            "tags": [random.choice(INTERESTS)],
            "ts": int(time.time() * 1000)
        }

    manifest = None
    if random.random() < 0.7:
        manifest = {
            "1": random.choice([
                "Ich pause, bevor ich wütend kommentiere.",
                "Ich verlasse Apps, die mich wütend machen.",
                "Ich folge nur Accounts, denen ich vertraue.",
                "Ich teile nichts ohne Quellprüfung.",
            ]),
            "2": random.choice([
                "Algorithmen sind keine Wahrheit.",
                "Empörung verkauft sich besser als Sachlichkeit.",
                "Mein Feed ist mein Spiegel — nicht die Welt.",
            ]),
            "3": "", "4": "", "5": ""
        }

    selfcheck_pre = {
        "source_check": random.randint(1, 4),
        "feed_influence": random.randint(2, 4),
        "comfort_disagree": random.randint(1, 4),
        "algo_understand": random.randint(1, 3),
        "pause_react": random.randint(1, 4)
    }
    # Post: leichte Verschiebung nach oben
    selfcheck_post = {k: min(5, v + random.randint(0, 2)) for k, v in selfcheck_pre.items()}

    save = {
        "meta": {"version": 2, "createdAt": int(time.time() * 1000), "lastSavedAt": int(time.time() * 1000), "day": 3},
        "character": {
            "name": name,
            "pronoun": pronoun,
            "avatar": random.randint(0, 11),
            "interests_initial": [random.choice(INTERESTS)],
            "city": "Greifshafen",
            "bio": bio,
            "protagonist": protag
        },
        "currentWeek": 26,
        "userProfile": {
            "interests": interests,
            "political_lean_estimated": political_lean,
            "outrage_tolerance": round(random.uniform(0.1, 0.6), 2),
            "followed": [f"char_{random.choice(['lea','finn','mira','jule','sara'])}" for _ in range(random.randint(2, 12))],
            "muted": [f"char_{random.choice(['bot1','bot2','redpill'])}" for _ in range(random.randint(0, 4))]
        },
        "weights": {
            "affinity": 1.0, "engagement": 0.9, "recency": 0.3, "social": 0.6,
            "ads": 0.4, "diversity": 0.08, "quality": 0.1, "outragePenalty": 0,
            "balance": 0
        },
        "history": gen_history(26, random.uniform(0.5, 1.0)),
        "ownPosts": [
            {"week": w, "text": "Test-Post", "tags": [random.choice(INTERESTS)], "outrage": 0.1, "ts": int(time.time() * 1000)}
            for w in random.sample(range(1, 26), random.randint(0, 7))
        ],
        "guildMemberships": guilds,
        "electionVote": voted,
        "ending": ending,
        "npcArcs": npc_arcs,
        "dmReplies": dm_replies,
        "badges": [],
        "bookmarks": bookmarks,
        "reflections": {"halftime": None, "mid": None, "final": None, "manifest": manifest},
        "selfcheck": {"pre": {"answers": selfcheck_pre}, "post": {"answers": selfcheck_post}},
        "contentWarningsAccepted": {},
        "shitstormHistory": []
    }
    return save


def main():
    archetypes = [
        "driven", "driven", "driven", "driven",
        "aware", "aware",
        "allyship", "allyship",
        "rabbithole", "rabbithole",
        "finn_saved", "finn_saved",
        "finn_lost",
        "crusader",
        "guarded", "guarded",
        "influencer",
        "nerd", "nerd",
        "driven", "aware", "driven", "guarded", "driven",
        "rabbithole", "allyship", "finn_saved", "driven", "driven", "nerd"
    ]
    random.seed(42)  # reproduzierbar
    for i, arch in enumerate(archetypes):
        save = gen_one(i, arch)
        out = OUT_DIR / f"spieler_{i+1:02d}_{arch}.json"
        out.write_text(json.dumps(save, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {len(archetypes)} files into {OUT_DIR.relative_to(ROOT)}/")


if __name__ == "__main__":
    main()
