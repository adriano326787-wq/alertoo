# -*- coding: utf-8 -*-
import sys, io, subprocess, time, math
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

"""
Simulacao GPS — Centro de Niteroi -> Praia de Icarai (~2.2 km)
Atualiza a cada 0.35 s para movimento fluido no app.
"""

ADB = "adb"

# Waypoints detalhados pelas ruas de Niteroi
# Seguindo: Centro -> Av. Rio Branco -> Praca Arariboa -> Av. Amaral Peixoto
#           -> R. Visconde de Sepetiba -> Av. Jansen de Melo -> Icarai
WAYPOINTS = [
    (-22.8929, -43.1136),  # 0  Centro — partida
    (-22.8935, -43.1141),  # 1
    (-22.8941, -43.1147),  # 2  Av. Rio Branco Norte
    (-22.8948, -43.1153),  # 3
    (-22.8955, -43.1159),  # 4  Praca Arariboa
    (-22.8961, -43.1166),  # 5
    (-22.8967, -43.1173),  # 6  Av. Amaral Peixoto
    (-22.8973, -43.1180),  # 7
    (-22.8979, -43.1187),  # 8
    (-22.8985, -43.1194),  # 9  Bifurcacao Fonseca
    (-22.8990, -43.1201),  # 10
    (-22.8995, -43.1208),  # 11 R. Visconde de Sepetiba
    (-22.9000, -43.1215),  # 12
    (-22.9004, -43.1222),  # 13
    (-22.9008, -43.1229),  # 14 R. Gaviao Peixoto
    (-22.9011, -43.1236),  # 15
    (-22.9014, -43.1243),  # 16 Av. Jansen de Melo
    (-22.9016, -43.1250),  # 17
    (-22.9018, -43.1257),  # 18 Chegando em Icarai
    (-22.9020, -43.1261),  # 19
    (-22.9022, -43.1264),  # 20 DESTINO — Praia de Icarai
]

SPEED_KMH  = 32          # velocidade simulada (km/h urbano)
INTERVAL_S = 0.35        # intervalo entre updates de GPS

def haversine(a, b):
    R = 6371000
    la1, lo1 = math.radians(a[0]), math.radians(a[1])
    la2, lo2 = math.radians(b[0]), math.radians(b[1])
    h = math.sin((la2-la1)/2)**2 + math.cos(la1)*math.cos(la2)*math.sin((lo2-lo1)/2)**2
    return 2 * R * math.asin(math.sqrt(h))

def bearing(a, b):
    la1, lo1 = math.radians(a[0]), math.radians(a[1])
    la2, lo2 = math.radians(b[0]), math.radians(b[1])
    x = math.sin(lo2-lo1)*math.cos(la2)
    y = math.cos(la1)*math.sin(la2) - math.sin(la1)*math.cos(la2)*math.cos(lo2-lo1)
    return (math.degrees(math.atan2(x, y)) + 360) % 360

def geo_fix(lat, lon, alt=5):
    try:
        subprocess.run(
            [ADB, "emu", "geo", "fix", f"{lon:.7f}", f"{lat:.7f}", str(alt)],
            capture_output=True, timeout=1
        )
    except Exception:
        pass

def lerp(a, b, t):
    return a + (b - a) * t

def fmt_dist(m):
    return f"{int(m)} m" if m < 1000 else f"{m/1000:.1f} km"

def fmt_time(s):
    m = int(s) // 60
    return f"{m}min {int(s)%60}s" if m else f"{int(s)}s"

# Constroi todos os pontos interpolados
speed_ms    = SPEED_KMH / 3.6
all_points  = []
total_dist  = 0.0

for i in range(len(WAYPOINTS) - 1):
    p1, p2  = WAYPOINTS[i], WAYPOINTS[i + 1]
    seg_m   = haversine(p1, p2)
    total_dist += seg_m
    seg_secs = seg_m / speed_ms
    steps    = max(2, int(seg_secs / INTERVAL_S))
    hdg      = bearing(p1, p2)
    for j in range(steps):
        t = j / steps
        all_points.append((lerp(p1[0], p2[0], t), lerp(p1[1], p2[1], t), hdg))

# Ultimo ponto exato
all_points.append((*WAYPOINTS[-1], bearing(WAYPOINTS[-2], WAYPOINTS[-1])))
total_secs = len(all_points) * INTERVAL_S

print("=" * 52)
print("  Simulacao GPS — Niteroi, RJ")
print("=" * 52)
print(f"  Origem:    Centro de Niteroi")
print(f"  Destino:   Praia de Icarai")
print(f"  Distancia: {fmt_dist(total_dist)}")
print(f"  Duracao:   ~{fmt_time(total_secs)} a {SPEED_KMH} km/h")
print(f"  Updates:   {len(all_points)} pontos a cada {INTERVAL_S}s")
print("=" * 52)
print()
print("  Iniciando em 3 s...")
print()
time.sleep(3)

BAR = 35
start_real = time.time()

for idx, (lat, lon, hdg) in enumerate(all_points):
    pct      = idx / max(1, len(all_points) - 1)
    done_m   = pct * total_dist
    left_m   = total_dist - done_m
    left_s   = (len(all_points) - idx) * INTERVAL_S
    filled   = int(BAR * pct)
    bar      = "#" * filled + "-" * (BAR - filled)

    print(f"\r  [{bar}] {pct*100:4.1f}%  "
          f"{fmt_dist(left_m)} rest  "
          f"{fmt_time(left_s)}",
          end="", flush=True)

    geo_fix(lat, lon)

    if idx < len(all_points) - 1:
        time.sleep(INTERVAL_S)

# Garante posicao exata no destino
geo_fix(*WAYPOINTS[-1])

elapsed = time.time() - start_real
print(f"\n\n  Chegou! Praia de Icarai")
print(f"  Tempo real: {fmt_time(elapsed)}  |  Distancia: {fmt_dist(total_dist)}")
print("=" * 52)
