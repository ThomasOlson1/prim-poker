const solc = require('solc');
const fs = require('fs');
const path = require('path');

// Read the contract source
const contractPath = path.join(__dirname, 'contracts', 'PokerFlatGasFee.sol');
const source = fs.readFileSync(contractPath, 'utf8');

// Read Chainlink dependencies
function findImports(importPath) {
  try {
    let fullPath;
    if (importPath.startsWith('@chainlink')) {
      fullPath = path.join(__dirname, 'node_modules', importPath);
    } else {
      fullPath = path.join(__dirname, 'contracts', importPath);
    }
    const content = fs.readFileSync(fullPath, 'utf8');
    return { contents: content };
  } catch (error) {
    return { error: 'File not found: ' + importPath };
  }
}

// Compile configuration
const input = {
  language: 'Solidity',
  sources: {
    'PokerFlatGasFee.sol': {
      content: source
    }
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 200
    },
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode', 'evm.methodIdentifiers']
      }
    }
  }
};

console.log('Compiling contract with solc-js version:', solc.version());

// Compile
const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));

// Check for errors
if (output.errors) {
  output.errors.forEach(error => {
    console.error(error.formattedMessage);
  });
  if (output.errors.some(error => error.severity === 'error')) {
    process.exit(1);
  }
}

// Create artifacts directory
const artifactsDir = path.join(__dirname, 'artifacts', 'contracts');
fs.mkdirSync(artifactsDir, { recursive: true });

// Write artifacts
for (const contractFile in output.contracts) {
  for (const contractName in output.contracts[contractFile]) {
    const contract = output.contracts[contractFile][contractName];

    const artifact = {
      _format: 'hh-sol-artifact-1',
      contractName: contractName,
      sourceName: contractFile,
      abi: contract.abi,
      bytecode: contract.evm.bytecode.object,
      deployedBytecode: contract.evm.deployedBytecode.object,
      linkReferences: contract.evm.bytecode.linkReferences || {},
      deployedLinkReferences: contract.evm.deployedBytecode.linkReferences || {}
    };

    const artifactPath = path.join(artifactsDir, `${contractName}.sol`, `${contractName}.json`);
    fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
    fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2));

    console.log(`✓ Compiled ${contractName}`);
  }
}

console.log('\n✓ Compilation successful!');
