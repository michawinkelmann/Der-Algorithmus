import re, os, json

# Strategie: ASCII-" innerhalb eines JSON-String-Werts escapen.
# Wir scannen jeden JSON-String-Wert, bei dem \"...\" nicht korrekt balanciert ist,
# und ersetzen dann alle ASCII-\" die NICHT direkt von einem Schluss (Komma/Brace/usw.) gefolgt sind
# durch das typografische Schlusszeichen „ (U+201C).

LCLOSE = '\u201C'  # "
LOPEN  = '\u201E'  # „

def find_and_fix(path):
    with open(path, 'r', encoding='utf-8') as f:
        txt = f.read()

    # Zustandsmaschine: wir laufen Zeichen für Zeichen
    out = []
    i = 0
    n = len(txt)
    in_string = False
    while i < n:
        c = txt[i]
        if not in_string:
            if c == '"':
                in_string = True
                out.append(c)
                i += 1
            else:
                out.append(c)
                i += 1
        else:
            if c == '\\' and i+1 < n:
                out.append(c); out.append(txt[i+1])
                i += 2
            elif c == '"':
                # Ist dies ein Terminator? Schauen wir, was danach kommt (ignoriere Whitespace)
                j = i + 1
                while j < n and txt[j] in ' \t\r\n':
                    j += 1
                if j >= n:
                    out.append(c)
                    in_string = False
                    i += 1
                elif txt[j] in ',:}]':
                    out.append(c)
                    in_string = False
                    i += 1
                else:
                    # Dies ist eigentlich ein Inhaltszeichen - durch „ ersetzen
                    out.append(LCLOSE)
                    i += 1
            else:
                out.append(c)
                i += 1

    fixed = ''.join(out)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(fixed)
    # Validieren
    try:
        json.loads(fixed)
        return True, None
    except Exception as e:
        return False, str(e)

for root, _, files in os.walk('data'):
    for f in files:
        if f.endswith('.json'):
            ok, err = find_and_fix(os.path.join(root, f))
            print(f'{os.path.join(root,f)}: {"OK" if ok else "FAIL " + err}')
