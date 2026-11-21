import assert from "node:assert/strict";
import { test } from "node:test";
import { countrySuggestions, findSearchResult, searchExplore } from "../src/lib/explore/search";
import { DEFAULT_CAMERA_OFFSET, type ViewCamera } from "../src/lib/explore/view-camera";
import { encodeView, mergeView, restoreView } from "../src/lib/explore/view-url";

test("busca por nome, termos com erro de digitação e comandos explícitos", () => {
  assert.equal(searchExplore("Peur")[0]?.id, "country:PER");
  assert.equal(searchExplore("Halley")[0]?.id, "body:HALLEY");
  assert.equal(searchExplore("constelacoes")[0]?.id, "cosmicLayer:CONSTELLATIONS");
  assert.ok(searchExplore("1969").some(({ id }) => id === "event:glo-1969"));
  assert.equal(searchExplore("Ir para 1969")[0]?.id, "year:1969");
  assert.equal(searchExplore("Ativar queimadas")[0]?.id, "layer:NASA_FIRMS");
  assert.equal(searchExplore("Abrir comparador BRA, ARG")[0]?.id, "compare:BRA,ARG");
  assert.equal(findSearchResult("compare:BRA,QQQ"), undefined);
  assert.equal(findSearchResult("country:__proto__"), undefined);
  assert.ok(countrySuggestions("PER", true).some(({ id }) => id === "layer:NASA_FIRMS"));
  assert.equal(countrySuggestions("PER", false).some(({ group }) => group === "layer"), false);
});

test("round trip da URL mantém recorte, posição relativa da câmera e parâmetros de cena", () => {
  const view: ViewCamera = { offset: DEFAULT_CAMERA_OFFSET, restore: null, onChange: null };
  const source = "?visao=1&cena=glo-1969&origem=aula&pais=PER&ano=1969&periodo=1947%2C1991&modo=cosmos&corpo=HALLEY&escala=real&camadasCosmos=ORBITS&camera=2.5%2C-3%2C5";
  assert.equal(restoreView(source, view), true);
  assert.deepEqual(view.restore, [2.5, -3, 5]);
  const params = new URLSearchParams(mergeView(source, encodeView(view)));
  assert.equal(params.get("cena"), "glo-1969");
  assert.equal(params.get("origem"), "aula");
  assert.equal(params.get("pais"), "PER");
  assert.equal(params.get("ano"), "1969");
  assert.equal(params.get("periodo"), "1947,1991");
  assert.equal(params.get("modo"), "cosmos");
  assert.equal(params.get("corpo"), "HALLEY");
  assert.equal(params.get("escala"), "real");
  assert.equal(params.get("camadasCosmos"), "ORBITS");
  assert.equal(params.get("camera"), "2.5,-3,5");

  assert.equal(restoreView("?visao=1&pais=constructor&periodo=20,19&ano=Infinity&corpo=constructor&camera=0,0,0", view), true);
  assert.equal(encodeView(view), "");
  assert.deepEqual(view.restore, DEFAULT_CAMERA_OFFSET);
});
