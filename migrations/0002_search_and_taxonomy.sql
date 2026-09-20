CREATE VIRTUAL TABLE games_fts USING fts5(game_id UNINDEXED,title,developer,categories,tags,tokenize='unicode61 remove_diacritics 2');
CREATE TRIGGER games_fts_insert AFTER INSERT ON games BEGIN
 INSERT INTO games_fts(game_id,title,developer,categories,tags) VALUES(new.id,new.title,coalesce(new.developer,''),'',new.tags);
END;
CREATE TRIGGER games_fts_delete AFTER DELETE ON games BEGIN DELETE FROM games_fts WHERE game_id=old.id; END;
CREATE TRIGGER games_fts_update AFTER UPDATE OF title,developer,tags ON games BEGIN
 DELETE FROM games_fts WHERE game_id=new.id;
 INSERT INTO games_fts(game_id,title,developer,categories,tags) SELECT new.id,new.title,coalesce(new.developer,''),coalesce((SELECT group_concat(c.name,' ') FROM categories c JOIN game_categories gc ON gc.category_id=c.id WHERE gc.game_id=new.id),''),new.tags;
END;
CREATE TRIGGER game_categories_fts_insert AFTER INSERT ON game_categories BEGIN
 UPDATE games_fts SET categories=(SELECT group_concat(c.name,' ') FROM categories c JOIN game_categories gc ON c.id=gc.category_id WHERE gc.game_id=new.game_id) WHERE game_id=new.game_id;
END;
CREATE TRIGGER game_categories_fts_delete AFTER DELETE ON game_categories BEGIN
 UPDATE games_fts SET categories=coalesce((SELECT group_concat(c.name,' ') FROM categories c JOIN game_categories gc ON c.id=gc.category_id WHERE gc.game_id=old.game_id),'') WHERE game_id=old.game_id;
END;
INSERT INTO categories(id,name,indexable) VALUES
('action','Action',0),('adventure','Adventure',0),('arcade','Arcade',0),('puzzle','Puzzle',0),('racing','Racing',0),('driving','Driving',0),('sports','Sports',0),('shooter','Shooter',0),('strategy','Strategy',0),('simulation','Simulation',0),('casual','Casual',0),('multiplayer','Multiplayer',0),('2-player','2 Player',0),('platform','Platform',0),('io','.io',0),('horror','Horror',0),('card','Card',0),('board','Board',0),('kids','Kids',0),('educational','Educational',0),('dress-up','Dress Up',0),('cooking','Cooking',0);
INSERT INTO providers(id,name,enabled,priority) VALUES ('playgama','Playgama',1,40),('gamepix','GamePix',1,30),('gamemonetize','GameMonetize',1,20),('wgplayground','WGPlayground',1,10);
INSERT INTO provider_contract_config(provider_id) SELECT id FROM providers;
INSERT INTO homepage_sections(id,title,rule,position,item_limit) VALUES
('continue','Jump back in','recent',0,6),('trending','Trending now','trending',1,6),('new','Fresh off the press','new',2,6),('popular','The crowd favorites','popular',3,6),('quick','A little break, a great game','category:casual',4,6),('multiplayer','Better together','category:multiplayer',5,6),('2-player','Bring your player two','category:2-player',6,6),('puzzle','Give your brain a playground','category:puzzle',7,6),('racing','Find your next gear','category:racing',8,6),('action','Straight into the action','category:action',9,6),('sports','Make your next move','category:sports',10,6);
