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
    Status INTEGER NOT NULL DEFAULT 0,
    Likes INTEGER NOT NULL DEFAULT 0,
    Dislikes INTEGER NOT NULL DEFAULT 0,
    Comments INTEGER NOT NULL DEFAULT 0,
    Views INTEGER NOT NULL DEFAULT 0
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

CREATE TABLE PostViews (
    UserId INTEGER,
    PostId INTEGER,
    CreatedOn TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (UserId, PostId, CreatedOn),
    FOREIGN KEY (UserId) REFERENCES Users(Id),
    FOREIGN KEY (PostId) REFERENCES Posts(Id)
);

CREATE TABLE FavoritePosts (
    UserId INTEGER NOT NULL,
    PostId INTEGER NOT NULL,
    PRIMARY KEY (UserId, PostId),
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
        (SELECT COUNT(*) FROM "Posts" WHERE "Status" = 1) as total_published_posts,
        
        -- New published posts in last 7 days
        (SELECT COUNT(*) FROM "Posts" 
         WHERE "CreatedOn" >= NOW() - INTERVAL '7 days' AND "Status" = 1) as new_published_posts_in_last_7_days,
        
        -- New published posts in last 30 days
        (SELECT COUNT(*) FROM "Posts" 
         WHERE "CreatedOn" >= NOW() - INTERVAL '30 days' AND "Status" = 1) as new_published_posts_in_last_30_days;
END;
$$ LANGUAGE plpgsql;

-- Stored procedure to track post views
CREATE OR REPLACE FUNCTION spTrackPostView(postId INT, userId INT)
RETURNS VOID AS $$
DECLARE
    reading_time INT;
    last_view_time TIMESTAMP;
BEGIN
    -- Get post reading time, default to 10 if null
    SELECT COALESCE("ReadingTime", 10) INTO reading_time
    FROM "Posts"
    WHERE "Id" = postId;
    
    -- If post doesn't exist, exit
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Get the most recent view for this user and post
    SELECT "CreatedOn" INTO last_view_time
    FROM "PostViews"
    WHERE "PostId" = postId AND "UserId" = userId
    ORDER BY "CreatedOn" DESC
    LIMIT 1;
    
    -- If no previous view or last view was more than reading_time minutes ago
    IF last_view_time IS NULL OR last_view_time < (NOW() - INTERVAL '1 minute' * reading_time) THEN
        -- Insert new view record
        INSERT INTO "PostViews" ("PostId", "UserId", "CreatedOn")
        VALUES (postId, userId, NOW());
        
        -- Update post views counter by counting all records for this post
        UPDATE "Posts"
        SET "Views" = (SELECT COUNT(*) FROM "PostViews" WHERE "PostId" = postId)
        WHERE "Id" = postId;
    END IF;
END;
$$ LANGUAGE plpgsql;