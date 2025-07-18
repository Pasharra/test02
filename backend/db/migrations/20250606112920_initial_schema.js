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
    table.timestamp('CreatedOn').notNullable().defaultTo(knex.fn.now());
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
    table.integer('Status').notNullable().defaultTo(0);
    table.integer('Likes').notNullable().defaultTo(0);
    table.integer('Dislikes').notNullable().defaultTo(0);
    table.integer('Comments').notNullable().defaultTo(0);
    table.integer('Views').notNullable().defaultTo(0);
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

  await knex.schema.createTable('PostViews', table => {
    table.integer('UserId').nullable();
    table.integer('PostId').notNullable();
    table.timestamp('ViewedOn').notNullable().defaultTo(knex.fn.now());
    table.string('IpAddress', 45).nullable(); // Support both IPv4 and IPv6
    table.string('UserAgent', 500).nullable();
    table.primary(['UserId', 'PostId', 'ViewedOn']);
    table.foreign('UserId').references('Users.Id');
    table.foreign('PostId').references('Posts.Id');
  });

  await knex.schema.createTable('FavoritePosts', table => {
    table.integer('UserId').notNullable();
    table.integer('PostId').notNullable();
    table.timestamp('CreatedOn').notNullable().defaultTo(knex.fn.now());
    table.primary(['UserId', 'PostId']);
    table.foreign('UserId').references('Users.Id');
    table.foreign('PostId').references('Posts.Id');
  });

  // Create stored procedure for dashboard metrics
  await knex.raw(`
    CREATE OR REPLACE FUNCTION get_dashboard_metrics()
    RETURNS TABLE (
        total_users BIGINT,
        new_users_in_last_7_days BIGINT,
        new_users_in_last_30_days BIGINT,
        total_published_posts BIGINT,
        new_published_posts_in_last_7_days BIGINT,
        new_published_posts_in_last_30_days BIGINT,
        total_active_subscriptions BIGINT
    ) AS $$
    BEGIN
        RETURN QUERY
        SELECT 
            -- Total users count
            (SELECT COUNT(*) FROM "Users") as total_users,
            
            -- New users in last 7 days
            (SELECT COUNT(*) FROM "Users" 
             WHERE "CreatedOn" >= NOW() - INTERVAL '7 days') as new_users_in_last_7_days,
            
            -- New users in last 30 days
            (SELECT COUNT(*) FROM "Users" 
             WHERE "CreatedOn" >= NOW() - INTERVAL '30 days') as new_users_in_last_30_days,
            
            -- Total published posts
            (SELECT COUNT(*) FROM "Posts") as total_published_posts,
            
            -- New published posts in last 7 days
            (SELECT COUNT(*) FROM "Posts" 
             WHERE "CreatedOn" >= NOW() - INTERVAL '7 days') as new_published_posts_in_last_7_days,
            
            -- New published posts in last 30 days
            (SELECT COUNT(*) FROM "Posts" 
             WHERE "CreatedOn" >= NOW() - INTERVAL '30 days') as new_published_posts_in_last_30_days,
            
            -- Total active subscriptions
            -- Since subscription data is stored in Auth0 user_metadata, we'll return 0 for now
            -- This would need to be implemented based on how subscription data is tracked
            0::BIGINT as total_active_subscriptions;
    END;
    $$ LANGUAGE plpgsql;
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Drop stored procedures first
  await knex.raw('DROP FUNCTION IF EXISTS get_dashboard_metrics();');
  
  // Drop tables in reverse order
  await knex.schema.dropTableIfExists('FavoritePosts');
  await knex.schema.dropTableIfExists('PostViews');
  await knex.schema.dropTableIfExists('PostComments');
  await knex.schema.dropTableIfExists('PostLabels');
  await knex.schema.dropTableIfExists('UserPostReaction');
  await knex.schema.dropTableIfExists('Labels');
  await knex.schema.dropTableIfExists('Posts');
  await knex.schema.dropTableIfExists('Users');
};
