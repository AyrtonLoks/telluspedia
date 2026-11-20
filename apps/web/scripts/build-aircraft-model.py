"""Generate the original TellusPedia aircraft model (CC0 1.0)."""
import json
import math
import struct
from pathlib import Path

WHITE = (.68, .84, 1.0)
BLUE = (.24, .61, .92)
SHADE = (.15, .35, .55)


def face(output, points, color):
    for index in range(1, len(points) - 1):
        for vertex in (points[0], points[index], points[index + 1]):
            output.append((*vertex, *color))


def prism(output, polygon, top, bottom, color):
    upper = [(x, top, z) for x, z in polygon]
    lower = [(x, bottom, z) for x, z in polygon]
    face(output, upper, color)
    face(output, lower[::-1], SHADE)
    for i in range(len(polygon)):
        j = (i + 1) % len(polygon)
        face(output, [upper[i], lower[i], lower[j], upper[j]], BLUE)


def tube(output, rings, x=0, y=0, sides=8):
    previous = None
    for z, radius in rings:
        current = [
            (x + radius * math.cos(math.tau * i / sides), y + radius * math.sin(math.tau * i / sides), z)
            for i in range(sides)
        ]
        if previous:
            for i in range(sides):
                j = (i + 1) % sides
                color = WHITE if i < sides // 2 else SHADE
                face(output, [previous[i], previous[j], current[j], current[i]], color)
        previous = current


def aircraft(detailed):
    vertices = []
    wing = [(.038, .13), (.16, .09), (.50, -.16), (.50, -.22), (.35, -.17), (.042, -.12)]
    tail = [(.028, -.30), (.19, -.40), (.21, -.46), (.027, -.42)]

    for sign in (-1, 1):
        for shape in (wing, tail):
            polygon = [(sign * x, z) for x, z in shape]
            if detailed:
                prism(vertices, polygon, .022, -.008, BLUE)
            else:
                face(vertices, [(x, .007, z) for x, z in polygon], WHITE)

    if detailed:
        tube(vertices, [(-.48, .002), (-.37, .041), (.34, .057), (.43, .051), (.51, .032), (.55, .002)])
        for sign in (-1, 1):
            tube(vertices, [(-.11, .002), (-.08, .035), (.07, .041), (.09, .002)], sign * .19, -.039, 6)
        face(vertices, [(0, .025, -.31), (0, .17, -.43), (0, .15, -.48), (0, .027, -.48)], BLUE)
        face(vertices, [(-.050, .025, .37), (.050, .025, .37), (.026, .048, .43), (-.026, .048, .43)], SHADE)
    else:
        face(vertices, [(-.033, 0, -.47), (.033, 0, -.47), (.055, 0, .36), (0, 0, .55), (-.055, 0, .36)], WHITE)
    return vertices


def main():
    blob = bytearray()
    view_specs = []
    accessor_specs = []
    meshes = []
    for name, vertices in (("AircraftNear", aircraft(True)), ("AircraftFar", aircraft(False))):
        args = []
        for offset in (0, 3):
            view_specs.append({"buffer": 0, "byteOffset": len(blob), "byteLength": len(vertices) * 12, "target": 34962})
            for vertex in vertices:
                blob.extend(struct.pack("<3f", *vertex[offset:offset + 3]))
            accessor = {"bufferView": len(view_specs) - 1, "componentType": 5126, "count": len(vertices), "type": "VEC3"}
            if offset == 0:
                accessor["min"] = [min(v[i] for v in vertices) for i in range(3)]
                accessor["max"] = [max(v[i] for v in vertices) for i in range(3)]
            args.append(len(accessor_specs))
            accessor_specs.append(accessor)
        meshes.append({"name": name, "primitives": [{"attributes": {"POSITION": args[0], "COLOR_0": args[1]}}]})
        print(f"{name}: {len(vertices) // 3} triangles")

    document = {
        "asset": {"version": "2.0", "generator": "TellusPedia build-aircraft-model.py", "copyright": "TellusPedia · CC0 1.0"},
        "scene": 0, "scenes": [{"nodes": [0, 1]}],
        "nodes": [{"name": mesh["name"], "mesh": i} for i, mesh in enumerate(meshes)],
        "meshes": meshes, "accessors": accessor_specs, "bufferViews": view_specs, "buffers": [{"byteLength": len(blob)}],
    }
    metadata = json.dumps(document, separators=(",", ":")).encode()
    metadata += b" " * (-len(metadata) % 4)
    chunks = struct.pack("<I4s", len(metadata), b"JSON") + metadata + struct.pack("<I4s", len(blob), b"BIN\0") + blob
    output = Path(__file__).resolve().parents[1] / "public/models/aircraft.glb"
    output.write_bytes(struct.pack("<4sII", b"glTF", 2, 12 + len(chunks)) + chunks)


if __name__ == "__main__":
    main()
