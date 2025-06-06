CREATE TABLE Users (
    Id SERIAL PRIMARY KEY,
    Avatar TEXT,
    FirstName VARCHAR(255),
    LastName VARCHAR(255),
    Email VARCHAR(255) NOT NULL,
    Auth0Id VARCHAR(255) NOT NULL UNIQUE,
    IsAdmin BOOLEAN
);

CREATE TABLE Posts (
    Id SERIAL PRIMARY KEY,
    Image TEXT,
    Title TEXT NOT NULL,
    Content TEXT NOT NULL,
    ReadingTime INTEGER,
    CreatedOn TIMESTAMP NOT NULL DEFAULT NOW(),
    IsPremium BOOLEAN
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