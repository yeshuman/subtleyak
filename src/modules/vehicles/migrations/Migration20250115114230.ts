import { Migration } from '@mikro-orm/migrations';

export class Migration20250115114230 extends Migration {

  async up(): Promise<void> {
    this.addSql('create table if not exists "vehicle_make" ("id" text not null, "name" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "vehicle_make_pkey" primary key ("id"));');
    this.addSql('CREATE INDEX IF NOT EXISTS "IDX_vehicle_make_deleted_at" ON "vehicle_make" (deleted_at) WHERE deleted_at IS NULL;');

    this.addSql('create table if not exists "vehicle_model" ("id" text not null, "name" text not null, "make_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "vehicle_model_pkey" primary key ("id"));');
    this.addSql('CREATE INDEX IF NOT EXISTS "IDX_vehicle_model_make_id" ON "vehicle_model" (make_id) WHERE deleted_at IS NULL;');
    this.addSql('CREATE INDEX IF NOT EXISTS "IDX_vehicle_model_deleted_at" ON "vehicle_model" (deleted_at) WHERE deleted_at IS NULL;');

    this.addSql('create table if not exists "vehicle" ("id" text not null, "make_id" text not null, "model_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "vehicle_pkey" primary key ("id"));');
    this.addSql('CREATE INDEX IF NOT EXISTS "IDX_vehicle_make_id" ON "vehicle" (make_id) WHERE deleted_at IS NULL;');
    this.addSql('CREATE INDEX IF NOT EXISTS "IDX_vehicle_model_id" ON "vehicle" (model_id) WHERE deleted_at IS NULL;');
    this.addSql('CREATE INDEX IF NOT EXISTS "IDX_vehicle_deleted_at" ON "vehicle" (deleted_at) WHERE deleted_at IS NULL;');

    this.addSql('alter table if exists "vehicle_model" add constraint "vehicle_model_make_id_foreign" foreign key ("make_id") references "vehicle_make" ("id") on update cascade;');

    this.addSql('alter table if exists "vehicle" add constraint "vehicle_make_id_foreign" foreign key ("make_id") references "vehicle_make" ("id") on update cascade;');
    this.addSql('alter table if exists "vehicle" add constraint "vehicle_model_id_foreign" foreign key ("model_id") references "vehicle_model" ("id") on update cascade;');
  }

  async down(): Promise<void> {
    this.addSql('alter table if exists "vehicle_model" drop constraint if exists "vehicle_model_make_id_foreign";');

    this.addSql('alter table if exists "vehicle" drop constraint if exists "vehicle_make_id_foreign";');

    this.addSql('alter table if exists "vehicle" drop constraint if exists "vehicle_model_id_foreign";');

    this.addSql('drop table if exists "vehicle_make" cascade;');

    this.addSql('drop table if exists "vehicle_model" cascade;');

    this.addSql('drop table if exists "vehicle" cascade;');
  }

}
