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

## Planetas (D21)

Para `pnpm --filter web textures:planets`, baixe para `assets-src/raw/planets/`:

| Arquivo em `raw/planets/` | URL | Licença |
|---|---|---|
| `2k_mercury.jpg`, `2k_venus_atmosphere.jpg`, `2k_mars.jpg`, `2k_jupiter.jpg`, `2k_saturn.jpg`, `2k_uranus.jpg`, `2k_neptune.jpg`, `2k_saturn_ring_alpha.png` | `https://www.solarsystemscope.com/textures/download/<arquivo>` | CC BY 4.0 — Solar System Scope |
| `pluto_usgs_1024.jpg` | https://d9-wret.s3.us-west-2.amazonaws.com/assets/palladium/production/s3fs-public/thumbnails/image/Pluto_NewHorizons_Global_Mosaic_300m_Jul2017_1024.jpg (da [página do USGS](https://www.usgs.gov/media/images/pluto-global-mosaic-new-horizons-july-2017)) | Domínio público — NASA/JHUAPL/SwRI/LPI |

SHA-256 dos originais usados: ver `assets-src/planets.sha256`.
