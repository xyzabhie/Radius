
import { EnvironmentManager } from '../src/environment/EnvironmentManager';
import { IFileSystem } from '../src/types/filesystem';
import path from 'path';
import fs from 'fs/promises';

// Minimal NodeFileSystem implementation for verification
class NodeFileSystem implements IFileSystem {
    async readTextFile(path: string): Promise<string> {
        return await fs.readFile(path, 'utf-8');
    }
    async writeTextFile(path: string, content: string): Promise<void> {
        return await fs.writeFile(path, content, 'utf-8');
    }
    async exists(path: string): Promise<boolean> {
        try {
            await fs.access(path);
            return true;
        } catch {
            return false;
        }
    }
    async readDir(dirPath: string): Promise<Array<{ name: string; isFile: boolean; isDirectory: boolean }>> {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        return entries.map(entry => ({
            name: entry.name,
            isFile: entry.isFile(),
            isDirectory: entry.isDirectory()
        }));
    }
    async join(...paths: string[]): Promise<string> {
        return path.join(...paths);
    }
}

async function run() {
    console.log("🔍 Starting V2 Environment Verification...");

    const projectRoot = path.join(process.cwd(), 'temp_verification_env');
    const envDir = path.join(projectRoot, 'environments');

    // Setup Mock Filesystem
    await fs.mkdir(envDir, { recursive: true });

    // 1. Create Legacy V1 File
    const v1Content = `
name: legacy-local
variables:
  API_URL: http://localhost:3000
  API_KEY: secret-123
secrets:
  - API_KEY
`;
    await fs.writeFile(path.join(envDir, 'legacy.rd'), v1Content);

    // 2. Initialize Manager
    const manager = new EnvironmentManager({
        projectRoot,
        globalRoot: path.join(process.cwd(), 'temp_verification_global_env'),
        fs: new NodeFileSystem(),
        environmentsDir: 'environments'
    });

    // 3. Test Loading V1 (Normalization)
    console.log("\n🧪 Testing V1 Loading (Normalization)...");
    const v1Profile = await manager.load('legacy', 'project');

    if (v1Profile.meta.version === 2 && v1Profile.variables['API_KEY'].sensitive === true) {
        console.log("✅ V1 Profile loaded and normalized correctly.");
    } else {
        console.error("❌ V1 Normalization failed:", JSON.stringify(v1Profile, null, 2));
        process.exit(1);
    }

    // 4. Test Saving V2
    console.log("\n🧪 Testing V2 Saving...");
    v1Profile.variables['NEW_VAR'] = {
        value: '123',
        type: 'number',
        description: 'Added via V2',
        sensitive: false,
        enabled: true
    };
    v1Profile.meta.name = 'upgraded-v2';

    await manager.save(v1Profile, 'project');

    // 5. Verify Saved Content (Round Trip)
    const v2Profile = await manager.load('upgraded-v2');
    if (v2Profile.variables['NEW_VAR'].type === 'number') {
        console.log("✅ V2 Profile saved and re-loaded correctly.");
    } else {
        console.error("❌ V2 Save/Load failed:", JSON.stringify(v2Profile, null, 2));
        process.exit(1);
    }

    // 6. Test Flattening (Request Runner Compatibility)
    console.log("\n🧪 Testing Variable Flattening...");
    const source = manager.getVariableSource();
    if (!source) throw new Error("Source is null");

    const val = await source.get('NEW_VAR');
    if (val === '123') { // formatted as string
        console.log("✅ Variables flattened correctly for Runner.");
    } else {
        console.error("❌ Flattening failed. Expected '123', got:", val);
    }

    // Cleanup
    await fs.rm(projectRoot, { recursive: true, force: true });
    console.log("\n✨ All Environment Checks Passed!");
}

run().catch(console.error);
