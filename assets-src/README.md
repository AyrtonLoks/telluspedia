# Originais das texturas do globo

Os arquivos de `raw/` não vão para o git (são grandes e reproduzíveis). Para regenerar as texturas de
`apps/web/public/textures/`, baixe-os para `assets-src/raw/` com estes nomes e rode
`pnpm --filter web textures:build` (ou só uma parte: `... textures:build day4k day2k night surface clouds paleo basis`).

| Arquivo em `raw/` | URL | Licença |
|---|---|---|
| `nasa_world.topo.bathy.200407.3x5400x2700.jpg` | https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-topography-bathymetry/july/world.topo.bathy.200407.3x5400x2700.jpg | Domínio público (NASA) |
| `nasa_gebco_08_rev_bath_5400x2700.jpg` | https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bathymetry/gebco_08_rev_bath_5400x2700.jpg | Domínio público (NASA) |
| `nasa_gebco_08_rev_elev_5400x2700.jpg` | https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/topography/gebco_08_rev_elev_5400x2700.jpg | Domínio público (NASA) |
| `nasa_cloud_combined_2048.jpg` | https://assets.science.nasa.gov/content/dam/science/esd/eo/content-feature/bluemarble/images/cloud_combined_2048.jpg | Domínio público (NASA) |
| `Scotese_Wright_2018_Maps_1-88_1degX1deg_PaleoDEMS_nc.zip` | https://zenodo.org/records/5460860 (arquivo de mesmo nome) | CC BY 4.0 — Scotese & Wright (2018) |

As luzes noturnas (`earth_night_*.jpg`) já estão em `public/textures/` e são reaproveitadas pelo script.

O encoder KTX2 roda em WebAssembly (`ktx2-encoder`) e é pesado: a diurna de 4K leva ~3 min e pede
alguns GB de RAM.
