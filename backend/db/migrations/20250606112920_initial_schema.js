/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  await knex.schema.createTable('Users', table => {
    table.increments('Id').primary();
    table.text('Avatar').nullable();
    table.string('FirstName', 255).nullable();
    table.string('LastName', 255).nullable();
    table.string('Email', 255).notNullable();
    table.string('Auth0Id', 255).notNullable().unique();
    table.boolean('IsAdmin').nullable();
  });

  await knex.schema.createTable('Posts', table => {
    table.increments('Id').primary();
    table.text('Image').nullable();
    table.text('Title').notNullable();
    table.text('Content').notNullable();
    table.text('Preview').notNullable();
    table.integer('ReadingTime').nullable();
    table.timestamp('CreatedOn').notNullable().defaultTo(knex.fn.now());
    table.timestamp('UpdatedOn').notNullable().defaultTo(knex.fn.now());
    table.boolean('IsPremium').nullable();
  });

  await knex.schema.createTable('Labels', table => {
    table.increments('Id').primary();
    table.string('Caption', 255).notNullable().unique();
  });

  await knex.schema.createTable('UserPostReaction', table => {
    table.integer('UserId').notNullable();
    table.integer('PostId').notNullable();
    table.integer('Reaction').nullable();
    table.primary(['UserId', 'PostId']);
    table.foreign('UserId').references('Users.Id');
    table.foreign('PostId').references('Posts.Id');
  });

  await knex.schema.createTable('PostLabels', table => {
    table.integer('PostId').notNullable();
    table.integer('LabelId').notNullable();
    table.primary(['PostId', 'LabelId']);
    table.foreign('PostId').references('Posts.Id');
    table.foreign('LabelId').references('Labels.Id');
  });

  await knex.schema.createTable('PostComments', table => {
    table.increments('Id').primary();
    table.integer('UserId');
    table.integer('PostId');
    table.text('Content').notNullable();
    table.timestamp('CreatedOn').notNullable().defaultTo(knex.fn.now());
    table.foreign('UserId').references('Users.Id');
    table.foreign('PostId').references('Posts.Id');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('PostComments');
  await knex.schema.dropTableIfExists('PostLabels');
  await knex.schema.dropTableIfExists('UserPostReaction');
  await knex.schema.dropTableIfExists('Labels');
  await knex.schema.dropTableIfExists('Posts');
  await knex.schema.dropTableIfExists('Users');
};
