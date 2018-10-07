// this script runs before `npm run build`

const path = require('path')
const fs = require('fs')
const utils = require('./utils')
const config = require('./HyperMD.config.js')

process.chdir(path.join(__dirname, ".."))

//--------------------------------------------------------------
// Update src/common.ts and update the version string

utils.processTextFile("./src/common.ts", (text) => {
  const packageJSON = JSON.parse(fs.readFileSync("package.json"))
  return text.replace(/(const version = )\S+/, (p, prefix) => prefix + JSON.stringify(packageJSON.version))
})

//--------------------------------------------------------------
// Update src/everything.ts, export all components in all-in-one bundle

var ai1_imports = []
var ai1_exports = []

for (const path of config.ambientComponents) {
  ai1_imports.push(`import "${path}"`)
}

for (const id in config.components) {
  const export_as = config.components[id]
  if (export_as) {
    ai1_exports.push(export_as)
    ai1_imports.push(`import * as ${export_as} from "${id}"`)
  } else {
    ai1_imports.push(`import "${id}"`)
  }
}

var core_pairs = []
for (const path in config.coreComponents) {
  const name = config.coreComponents[path]
  core_pairs.push({ path, name })
}

var ai1_code = `// Import&Export all HyperMD components except PowerPacks
// (This file is also used to generate all-in-one bundle)
//
// **DO NOT EDIT!** This file is generated by script.
//
// @see dev/HyperMD.config.js
//

export * from "./common"

${ai1_imports.join("\n")}

${ai1_exports.length ? ("export {\n" + ai1_exports.map(x => `  ${x},\n`).join("") + "}") : ("// No more exports")}

${core_pairs.map((it, index) => `import * as _CORE_${index} from "${it.path}"`).join("\n")}
export const Core = {
${core_pairs.map((it, index) => `  "${it.name}": _CORE_${index}`).join(",\n")}
};
`

fs.writeFileSync("./src/everything.ts", ai1_code)

//--------------------------------------------------------------
// Export symbol manifest for plain browser env

!function () {
  let manifest = {
    "//$1": "Auto generated manifest",
    version: 1,
    path: {
      "hypermd": "HyperMD",
    },
  }

  for (const mod in config.globalNames) manifest.path[mod] = config.globalNames[mod]
  for (const path in config.components) manifest.path["hypermd/" + path.slice(2)] = "HyperMD." + config.components[path];
  for (const path in config.coreComponents) manifest.path["hypermd/" + path.slice(2)] = "HyperMD.Core." + config.coreComponents[path];

  fs.writeFileSync("pbe.manifest.json", JSON.stringify(manifest, null, 2))
}();
