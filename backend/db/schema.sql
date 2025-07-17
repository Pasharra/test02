CREATE TABLE Users (
    Id SERIAL PRIMARY KEY,
    Avatar TEXT,
    FirstName VARCHAR(255),
    LastName VARCHAR(255),
    Email VARCHAR(255) NOT NULL,
    Auth0Id VARCHAR(255) NOT NULL UNIQUE,
    IsAdmin BOOLEAN,
    CreatedOn TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE Posts (
    Id SERIAL PRIMARY KEY,
    Image TEXT,
    Title TEXT NOT NULL,
    Content TEXT NOT NULL,
    Preview TEXT NOT NULL,
    ReadingTime INTEGER,
    CreatedOn TIMESTAMP NOT NULL DEFAULT NOW(),
    UpdatedOn TIMESTAMP NOT NULL DEFAULT NOW(),
    IsPremium BOOLEAN,
    Status INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE UserPostReaction (
    UserId INTEGER NOT NULL,
    PostId INTEGER NOT NULL,
    Reaction INTEGER,
    PRIMARY KEY (UserId, PostId),
    FOREIGN KEY (UserId) REFERENCES Users(Id),
    FOREIGN KEY (PostId) REFERENCES Posts(Id)
);

CREATE TABLE Labels (
    Id SERIAL PRIMARY KEY,
    Caption VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE PostLabels (
    PostId INTEGER NOT NULL,
    LabelId INTEGER NOT NULL,
    PRIMARY KEY (PostId, LabelId),
    FOREIGN KEY (PostId) REFERENCES Posts(Id),
    FOREIGN KEY (LabelId) REFERENCES Labels(Id)
);

CREATE TABLE PostComments (
    Id SERIAL PRIMARY KEY,
    UserId INTEGER,
    PostId INTEGER,
    Content TEXT NOT NULL,
    CreatedOn TIMESTAMP NOT NULL DEFAULT NOW(),
    FOREIGN KEY (UserId) REFERENCES Users(Id),
    FOREIGN KEY (PostId) REFERENCES Posts(Id)
);

-- Stored procedure to get dashboard metrics
CREATE OR REPLACE FUNCTION get_dashboard_metrics()
RETURNS TABLE (
    total_users BIGINT,
    new_users_in_last_7_days BIGINT,
    new_users_in_last_30_days BIGINT,
    total_published_posts BIGINT,
    new_published_posts_in_last_7_days BIGINT,
    new_published_posts_in_last_30_days BIGINT
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
         WHERE "CreatedOn" >= NOW() - INTERVAL '30 days') as new_published_posts_in_last_30_days;
END;
$$ LANGUAGE plpgsql;

-- Stored procedure to get most liked posts
CREATE OR REPLACE FUNCTION get_most_liked_posts(post_count INTEGER)
RETURNS TABLE (
    title TEXT,
    number_of_likes BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p."Title" as title,
        COALESCE((SELECT COUNT(*) FROM "UserPostReaction" upr WHERE upr."PostId" = p."Id" AND upr."Reaction" = 1), 0) as number_of_likes
    FROM "Posts" p
    ORDER BY (SELECT COUNT(*) FROM "UserPostReaction" upr WHERE upr."PostId" = p."Id" AND upr."Reaction" = 1) DESC
    LIMIT post_count;
END;
$$ LANGUAGE plpgsql;

-- Stored procedure to get most commented posts
CREATE OR REPLACE FUNCTION get_most_commented_posts(post_count INTEGER)
RETURNS TABLE (
    title TEXT,
    number_of_comments BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p."Title" as title,
        COALESCE((SELECT COUNT(*) FROM "PostComments" pc WHERE pc."PostId" = p."Id"), 0) as number_of_comments
    FROM "Posts" p
    ORDER BY (SELECT COUNT(*) FROM "PostComments" pc WHERE pc."PostId" = p."Id") DESC
    LIMIT post_count;
END;
$$ LANGUAGE plpgsql; 