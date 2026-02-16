
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
        // Ensure directory exists before writing
        const dir = path.substring(0, path.lastIndexOf(path.includes('/') ? '/' : '\\'));
        try {
            await fs.mkdir(dir, { recursive: true });
        } catch { }
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
    console.log("🔍 Starting Hybrid Environment Verification...");

    const testRoot = path.join(process.cwd(), 'temp_hybrid_test');
    const projectRoot = path.join(testRoot, 'project');
    const globalRoot = path.join(testRoot, 'global');

    // Setup Mock Filesystem
    await fs.mkdir(path.join(projectRoot, 'environments'), { recursive: true });
    await fs.mkdir(path.join(globalRoot, 'environments'), { recursive: true });

    // 1. Initialize Manager
    const manager = new EnvironmentManager({
        projectRoot,
        globalRoot,
        fs: new NodeFileSystem(),
        environmentsDir: 'environments'
    });

    // 2. Create Global Environment
    console.log("\n🧪 Creating Global Environment...");
    const globalProfile = {
        meta: { version: 2, name: 'my-global-env', description: "Global Scope" },
        variables: { GLOBAL_VAR: { value: "global-value", type: "string" as const, enabled: true } }
    };
    await manager.save(globalProfile, 'global');

    // 3. Create Project Environment
    console.log("\n🧪 Creating Project Environment...");
    const projectProfile = {
        meta: { version: 2, name: 'my-project-env', description: "Project Scope" },
        variables: { PROJECT_VAR: { value: "project-value", type: "string" as const, enabled: true } }
    };
    await manager.save(projectProfile, 'project');

    // 4. Verify Listing
    console.log("\n🧪 Verifying List Profiles...");
    const lists = await manager.listProfiles();
    console.log("Lists:", JSON.stringify(lists, null, 2));

    if (lists.global.includes('my-global-env') && lists.project.includes('my-project-env')) {
        console.log("✅ Listing returned correct scopes.");
    } else {
        console.error("❌ Listing failed.");
        process.exit(1);
    }

    // 5. Verify Loading (Scope Resolution)
    console.log("\n🧪 Verifying Load...");

    const loadedGlobal = await manager.load('my-global-env', 'global');
    if (loadedGlobal.variables['GLOBAL_VAR']) {
        console.log("✅ Loaded Global env correctly.");
    } else {
        console.error("❌ Failed to load Global env.");
    }

    const loadedProject = await manager.load('my-project-env', 'project');
    if (loadedProject.variables['PROJECT_VAR']) {
        console.log("✅ Loaded Project env correctly.");
    } else {
        console.error("❌ Failed to load Project env.");
    }

    // 6. Verify Explicit Auto-Resolution (Collision Handling)
    // Create a conflict
    console.log("\n🧪 Verifying Collision Resolution...");
    const conflictGlobal = { ...globalProfile, meta: { ...globalProfile.meta, name: 'conflict' } };
    const conflictProject = { ...projectProfile, meta: { ...projectProfile.meta, name: 'conflict' } };

    await manager.save(conflictGlobal, 'global');
    await manager.save(conflictProject, 'project');

    // Load without scope -> Should prefer Project
    const resolved = await manager.load('conflict');
    if (resolved.variables['PROJECT_VAR']) {
        console.log("✅ Auto-resolution preferred Project scope (Correct).");
    } else {
        console.error("❌ Auto-resolution failed. Got:", resolved);
    }

    // Cleanup
    await fs.rm(testRoot, { recursive: true, force: true });
    console.log("\n✨ Hybrid Architecture Verified!");
}

run().catch(console.error);
