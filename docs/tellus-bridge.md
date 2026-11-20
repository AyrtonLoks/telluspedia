# TellusBridge v1.0.0 no TellusPedia

A integração utiliza três documentos com `kind` e `schemaVersion: "1.0.0"`. O TellusLab gera os arquivos e mantém as fontes curriculares. O espelho em [contract](../apps/web/src/lib/tellus-bridge/contract) contém os tipos TypeScript, os schemas JSON e os dois catálogos estáticos.

- `TellusDomainRegistryV1` descreve 8 domínios, 197 obras e 299 nós qualificados. Cada nó tem título, complexidade, trilha, modalidades, bibliografia e pré-requisitos tipados.
- `TellusCrossLinkManifestV1` relaciona países, dossiês, eras, eventos, figuras e módulos do Observatório a macrotemas e obras.
- `TellusLabSnapshotV1` transporta progresso ponderado por complexidade, proficiência S0–S6, métricas FSRS-5 do próximo cartão, fila vencida e sugestões. O Hub indica quando os dados foram exportados. Os vínculos curriculares exibem S0 até o primeiro snapshot.

## Configuração e verificação

1. Inicie o TellusLab com `npm ci` e `npm start`. O endereço padrão é `http://127.0.0.1:4175`. O build aceita `VITE_TELLUSPEDIA_URL`, com padrão `http://127.0.0.1:3000`.
2. Inicie este projeto com `pnpm install`, `pnpm db:generate` e `pnpm dev`. Configure `NEXT_PUBLIC_TELLUSLAB_URL` com a origem do Lab se usar uma porta diferente.
3. Abra `http://127.0.0.1:3000/telluslab`, escolha um dossiê e siga **Aprofundar no TellusLab → Estudar**. O contexto abre o domínio e seleciona o macrotema. **Explorar no TellusPedia** leva ao destino correspondente. O breadcrumb **Retornar ao nó** abre o mesmo nó.
4. Em origens separadas, use **Snapshot → Exportar os oito domínios** no Lab e **Importar snapshot JSON** no Hub. O navegador guarda a projeção de progresso. Evidências, rascunhos, soluções e outros dados de backup ficam no arquivo global do Lab.
5. Para servir o Lab pela mesma origem, execute `TELLUSLAB_PROXY_URL=http://127.0.0.1:4175 NEXT_PUBLIC_TELLUSLAB_URL=http://127.0.0.1:3000 pnpm dev`. Abra o Lab por `/lab` no host do TellusPedia e o Hub em outra aba. A publicação do Lab na chave `tellusbridge.snapshot.v1` e os eventos `storage` e `BroadcastChannel` atualizam o painel automaticamente. A versão de progresso com a data de exportação mais recente prevalece.

O deep-link para o Lab usa `/lab?domain=physics&node=DOM-PHYS%3A6.5&ref=telluspedia&entity=observatory%3ACOSMOS`. O retorno usa o caminho do manifesto e os parâmetros `entity`, `fromDomain` e `fromNode`.

## Adicionar um Domain Pack

1. Adicione a especificação, o manifesto de origem e a seed no TellusLab. Atualize as dependências de parsing, o perfil e o inventário esperado. Rode `npm run domains:validate` para validar contagens, bibliografia e aciclicidade.
2. Adicione os vínculos no gerador `scripts/bridge-catalog.mjs` do TellusLab. Use IDs de entidades existentes ou registre a nova página de dossiê ou ação no TellusPedia. Os componentes contextuais usam os IDs do manifesto.
3. Rode `npm run bridge:sync` no Lab para materializar o espelho neste checkout, seguido de `npm run bridge:verify`. `TELLUSPEDIA_REPO` permite apontar para outro checkout.
4. Execute `pnpm typecheck`, `pnpm lint`, `pnpm test` e `pnpm build` no TellusPedia. A suíte verifica o catálogo, o manifesto, os deep-links e a renderização do contexto com e sem snapshot.
