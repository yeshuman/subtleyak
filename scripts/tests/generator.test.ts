import { generateModule } from '../generate-v2';
import { TestUtils } from './test-utils';
import path from 'path';
import fs from 'fs/promises';
import type { ModuleConfig } from '../generate-v2';
import { describe, it, expect, beforeEach, beforeAll, jest } from '@jest/globals';
import Handlebars from 'handlebars';

// Load actual template content
async function loadTemplates() {
  const templateDir = path.join(process.cwd(), 'scripts/templates');
  const modelTemplate = await fs.readFile(
    path.join(templateDir, 'src/modules/[module.plural]/models/[model.name].hbs'),
    'utf-8'
  );
  const serviceTemplate = await fs.readFile(
    path.join(templateDir, 'src/modules/[module.plural]/service.hbs'),
    'utf-8'
  );
  const indexTemplate = await fs.readFile(
    path.join(templateDir, 'src/modules/[module.plural]/index.hbs'),
    'utf-8'
  );

  return { modelTemplate, serviceTemplate, indexTemplate };
}

// Register Handlebars helpers and templates
beforeAll(async () => {
  const templates = await loadTemplates();

  // Register templates
  Handlebars.registerPartial('model', templates.modelTemplate);
  Handlebars.registerPartial('service', templates.serviceTemplate);
  Handlebars.registerPartial('index', templates.indexTemplate);

  // Register helpers
  Handlebars.registerHelper('toPascalCase', (str: string) => {
    if (!str) return '';
    return str.split('-')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
  });

  Handlebars.registerHelper('toSnakeCase', (str: string) => {
    if (!str) return '';
    return str.replace(/-/g, '_').toLowerCase();
  });

  Handlebars.registerHelper('toKebabCase', (str: string) => {
    if (!str) return '';
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  });
});

describe('Module Generator', () => {
  const TEST_CONFIG: ModuleConfig = {
    moduleName: 'tests',
    singular: 'test',
    plural: 'tests',
    models: [
      {
        name: 'test-parent',
        singular: 'parent',
        plural: 'parents',
        isParent: true,
        fields: [
          {
            name: 'title',
            type: 'text',
            validation: { min: 1, required: true }
          },
          {
            name: 'description',
            type: 'text',
            chainables: [{ name: 'nullable' }]
          },
          {
            name: 'code',
            type: 'text',
            chainables: [{ name: 'unique' }],
            validation: { min: 3, max: 10 }
          },
          {
            name: 'active',
            type: 'boolean'
          },
          {
            name: 'count',
            type: 'number',
            chainables: [{ name: 'nullable' }]
          },
          {
            name: 'children',
            type: 'text',
            relation: {
              type: 'hasMany',
              model: 'TestChild',
              mappedBy: 'parent'
            }
          },
          {
            name: 'related_items',
            type: 'text',
            relation: {
              type: 'manyToMany',
              model: 'TestRelatedItem',
              through: 'test_parent_related_items'
            }
          }
        ]
      },
      {
        name: 'test-child',
        singular: 'child',
        plural: 'children',
        parent: {
          model: 'TestParent',
          routePrefix: 'parents/children'
        },
        fields: [
          {
            name: 'name',
            type: 'text'
          },
          {
            name: 'parent',
            type: 'text',
            relation: {
              type: 'belongsTo',
              model: 'TestParent',
              mappedBy: 'children'
            }
          }
        ]
      },
      {
        name: 'test-related-item',
        singular: 'related-item',
        plural: 'related-items',
        fields: [
          {
            name: 'name',
            type: 'text'
          },
          {
            name: 'parents',
            type: 'text',
            relation: {
              type: 'manyToMany',
              model: 'TestParent',
              through: 'test_parent_related_items'
            }
          }
        ]
      }
    ]
  };

  beforeEach(async () => {
    // Clean test output directory
    await TestUtils.cleanTestDir();
  });

  describe('Template Validation', () => {
    it('should validate all template files exist', async () => {
      const templateDir = path.join(process.cwd(), 'scripts/templates');
      const requiredTemplates = [
        'src/modules/[module.plural]/models/[model.name].hbs',
        'src/modules/[module.plural]/service.hbs',
        'src/modules/[module.plural]/index.hbs'
      ];

      for (const template of requiredTemplates) {
        const templatePath = path.join(templateDir, template);
        const exists = await TestUtils.fileExists(templatePath);
        expect(exists).toBe(true);
      }
    });

    it('should validate template syntax', async () => {
      const templateDir = path.join(process.cwd(), 'scripts/templates');
      const templates = await TestUtils.getTemplateFiles(templateDir);

      for (const templatePath of templates) {
        const content = await fs.readFile(templatePath, 'utf-8');
        expect(() => {
          Handlebars.compile(content);
        }).not.toThrow();
      }
    });

    it('should validate helper functions', () => {
      const helpers = Handlebars.helpers;
      expect(helpers.toPascalCase).toBeDefined();
      expect(helpers.toSnakeCase).toBeDefined();
      expect(helpers.toKebabCase).toBeDefined();

      // Test helper functions
      expect(helpers.toPascalCase('test-model')).toBe('TestModel');
      expect(helpers.toSnakeCase('test-model')).toBe('test_model');
      expect(helpers.toKebabCase('test-model')).toBe('test-model');
    });
  });

  describe('File Generation', () => {
    it('should generate model file in correct location', async () => {
      await generateModule(TEST_CONFIG, { testMode: true });
      
      const expectedPath = path.join('.test-output', 'src/modules/tests/models/test-parent.ts');
      expect(await TestUtils.fileExists(expectedPath)).toBe(true);
    });

    it('should generate model file with correct content', async () => {
      await generateModule(TEST_CONFIG, { testMode: true });
      
      const modelPath = path.join('.test-output', 'src/modules/tests/models/test-parent.ts');
      const content = await TestUtils.readGeneratedFile(modelPath);
      
      // Check basic structure
      expect(content).toContain('const TestParent = model.define("test_parent"');
      
      // Check fields with chainables
      expect(content).toContain('title: model.text()');
      expect(content).toContain('description: model.text().nullable()');
      expect(content).toContain('code: model.text().unique()');
      expect(content).toContain('active: model.boolean()');
      expect(content).toContain('count: model.number().nullable()');
      
      // Check relations
      expect(content).toContain('children: model.hasMany(() => TestChild');
      expect(content).toContain('related_items: model.manyToMany(() => TestRelatedItem');
    });

    it('should generate valid TypeScript files', async () => {
      await generateModule(TEST_CONFIG, { testMode: true });
      const files = await TestUtils.getGeneratedFiles('.test-output');
      
      for (const file of files) {
        const content = await TestUtils.readGeneratedFile(path.join('.test-output', file));
        expect(content).toMatch(/^import .* from/m); // Has imports
        expect(content).not.toContain('undefined');  // No undefined values
        expect(content).toMatch(/export (default |type )/m); // Has exports
      }
    });
  });

  describe('Service Generation', () => {
    it('should generate service file with correct content', async () => {
      await generateModule(TEST_CONFIG, { testMode: true });
      
      const servicePath = path.join('.test-output', 'src/modules/tests/service.ts');
      const content = await TestUtils.readGeneratedFile(servicePath);
      
      // Check service structure
      expect(content).toContain('import { MedusaService } from "@medusajs/framework/utils"');
      expect(content).toContain('import TestParent from "./models/test-parent"');
      expect(content).toContain('class TestsService extends MedusaService({');
      expect(content).toContain('TestParent');
      expect(content).toContain('export default TestsService');
    });
  });

  describe('Module Index', () => {
    it('should generate module index file with correct content', async () => {
      await generateModule(TEST_CONFIG, { testMode: true });
      
      const indexPath = path.join('.test-output', 'src/modules/tests/index.ts');
      const content = await TestUtils.readGeneratedFile(indexPath);
      
      // Check module index structure
      expect(content).toContain('import TestsService from "./service"');
      expect(content).toContain('import { Module } from "@medusajs/framework/utils"');
      expect(content).toContain('export const TESTS = "tests"');
      expect(content).toContain('export default Module(TESTS, {');
      expect(content).toContain('service: TestsService');
    });
  });

  describe('Model Relations', () => {
    it('should generate model with belongsTo relation', async () => {
      await generateModule(TEST_CONFIG, { testMode: true });
      
      const modelPath = path.join('.test-output', 'src/modules/tests/models/test-child.ts');
      const content = await TestUtils.readGeneratedFile(modelPath);
      
      // Check belongsTo relation
      expect(content).toContain('parent: model.belongsTo(() => TestParent, {');
      expect(content).toContain('mappedBy: "children"');
    });

    it('should generate model with hasMany relation', async () => {
      await generateModule(TEST_CONFIG, { testMode: true });
      
      const modelPath = path.join('.test-output', 'src/modules/tests/models/test-parent.ts');
      const content = await TestUtils.readGeneratedFile(modelPath);
      
      // Check hasMany relation
      expect(content).toContain('children: model.hasMany(() => TestChild, {');
      expect(content).toContain('mappedBy: "parent"');
    });

    it('should generate model with manyToMany relation', async () => {
      await generateModule(TEST_CONFIG, { testMode: true });
      
      const modelPath = path.join('.test-output', 'src/modules/tests/models/test-parent.ts');
      const content = await TestUtils.readGeneratedFile(modelPath);
      
      // Check manyToMany relation
      expect(content).toContain('related_items: model.manyToMany(() => TestRelatedItem, {');
      expect(content).toContain('through: "test_parent_related_items"');
    });

    it('should import related models', async () => {
      await generateModule(TEST_CONFIG, { testMode: true });
      
      const modelPath = path.join('.test-output', 'src/modules/tests/models/test-parent.ts');
      const content = await TestUtils.readGeneratedFile(modelPath);
      
      // Check imports
      expect(content).toContain('import TestChild from "./test-child"');
      expect(content).toContain('import TestRelatedItem from "./test-related-item"');

      // Check import order
      const lines = content.split('\n');
      const importLines = lines.filter(line => line.startsWith('import'));
      
      expect(importLines[0]).toContain('@medusajs/framework/utils');
      expect(importLines.length).toBe(3); // framework, TestChild, TestRelatedItem
    });
  });

  describe('Field Generation', () => {
    it('should generate fields with database-level chainables', async () => {
      await generateModule(TEST_CONFIG, { testMode: true });
      
      const modelPath = path.join('.test-output', 'src/modules/tests/models/test-parent.ts');
      const content = await TestUtils.readGeneratedFile(modelPath);
      
      // Check fields with chainables
      expect(content).toContain('title: model.text()');  // No validation in model
      expect(content).toContain('description: model.text().nullable()');
      expect(content).toContain('code: model.text().unique()');
      expect(content).toContain('count: model.number().nullable()');
    });
  });

  describe('Validator Generation', () => {
    it('should generate validators file with correct content', async () => {
      await generateModule(TEST_CONFIG, { testMode: true });
      
      const validatorsPath = path.join('.test-output', 'src/api/admin/tests/parents/validators.ts');
      const content = await TestUtils.readGeneratedFile(validatorsPath);
      
      // Check basic structure
      expect(content).toContain('import { z } from "zod"');
      expect(content).toContain('createFindParams');
      
      // Check validation rules
      expect(content).toContain('title: z.string().min(1)'); // required field
      expect(content).toContain('description: z.string().optional()'); // optional field
      expect(content).toContain('code: z.string().optional().min(3).max(10)'); // with min/max
      
      // Check types are exported
      expect(content).toContain('export type AdminCreateTestParentReq');
      expect(content).toContain('export type AdminUpdateTestParentReq');
    });
  });

  describe('API Route Generation', () => {
    it('should generate parent list/create route file with correct content', async () => {
      await generateModule(TEST_CONFIG, { testMode: true });
      
      const routePath = path.join('.test-output', 'src/api/admin/tests/parents/route.ts');
      const content = await TestUtils.readGeneratedFile(routePath);
      
      // Check imports
      expect(content).toContain('import { z } from "zod"');
      expect(content).toContain('import { createFindParams, AdminCreateTestParentReq } from "./validators"');
      
      // Check route handlers
      expect(content).toContain('export async function GET(');
      expect(content).toContain('export async function POST(');
      
      // Check service usage
      expect(content).toContain('const service = container.resolve("tests")');
      expect(content).toContain('const result = await service.list(');
      expect(content).toContain('const result = await service.create(');
    });

    it('should generate parent update/delete route file with correct content', async () => {
      await generateModule(TEST_CONFIG, { testMode: true });
      
      const routePath = path.join('.test-output', 'src/api/admin/tests/parents/[id]/route.ts');
      const content = await TestUtils.readGeneratedFile(routePath);
      
      // Check imports
      expect(content).toContain('import { z } from "zod"');
      expect(content).toContain('import { AdminUpdateTestParentReq } from "../validators"');
      
      // Check route handlers
      expect(content).toContain('export async function GET(');
      expect(content).toContain('export async function PUT(');
      expect(content).toContain('export async function DELETE(');
      
      // Check service usage
      expect(content).toContain('const service = container.resolve("tests")');
      expect(content).toContain('const result = await service.retrieve(');
      expect(content).toContain('const result = await service.update(');
      expect(content).toContain('const result = await service.delete(');
    });

    it('should generate child routes using parent routePrefix', async () => {
      await generateModule(TEST_CONFIG, { testMode: true });
      
      // Child routes should be under parent route prefix
      const listRoutePath = path.join('.test-output', 'src/api/admin/tests/parents/children/route.ts');
      const updateRoutePath = path.join('.test-output', 'src/api/admin/tests/parents/children/[id]/route.ts');
      
      expect(await TestUtils.fileExists(listRoutePath)).toBe(true);
      expect(await TestUtils.fileExists(updateRoutePath)).toBe(true);

      // Check child route content
      const content = await TestUtils.readGeneratedFile(listRoutePath);
      expect(content).toContain('import { createFindParams, AdminCreateTestChildReq } from "./validators"');
      expect(content).toContain('const service = container.resolve("tests")');
    });

    it('should handle relations in route responses', async () => {
      await generateModule(TEST_CONFIG, { testMode: true });
      
      const routePath = path.join('.test-output', 'src/api/admin/tests/parents/route.ts');
      const content = await TestUtils.readGeneratedFile(routePath);
      
      // Check relation handling
      expect(content).toContain('relations: ["children", "related_items"]');
      expect(content).toContain('select: ["id", "title", "description", "code", "active", "count"]');
    });
  });
}); 