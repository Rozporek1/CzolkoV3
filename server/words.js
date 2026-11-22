const w = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);

export const CATEGORIES = [
  { id: 'celebrities', name: 'Celebrities', emoji: '🌟', words: w('Taylor Swift,Beyoncé,Rihanna,Dwayne Johnson,Tom Hanks,Zendaya,Leonardo DiCaprio,Ariana Grande,Ed Sheeran,Jennifer Lawrence,Brad Pitt,Lady Gaga,Keanu Reeves,Margot Robbie,Will Smith,Billie Eilish,Ryan Reynolds,Emma Watson,Drake,Selena Gomez') },
  { id: 'movies', name: 'Movies', emoji: '🎬', words: w('Titanic,Jurassic Park,The Lion King,Inception,Frozen,Shrek,Star Wars,The Matrix,Finding Nemo,Harry Potter,Avatar,Toy Story,Jaws,The Godfather,Forrest Gump,Gladiator,Home Alone,Back to the Future,The Avengers,Barbie') },
  { id: 'tv', name: 'TV Shows', emoji: '📺', words: w('Friends,Breaking Bad,Game of Thrones,The Office,Stranger Things,The Simpsons,Squid Game,Sherlock,The Mandalorian,Money Heist,Seinfeld,Black Mirror,The Witcher,Wednesday,Peaky Blinders,Dexter,Lost,House,Westworld,Bluey') },
  { id: 'cartoons', name: 'Cartoon Characters', emoji: '🐭', words: w('Mickey Mouse,SpongeBob,Bugs Bunny,Homer Simpson,Scooby-Doo,Tom and Jerry,Pikachu,Elsa,Winnie the Pooh,Donald Duck,Bart Simpson,Woody,Buzz Lightyear,Shrek,Garfield,Popeye,Dora,Peppa Pig,Goofy,Pinocchio') },
  { id: 'animals', name: 'Animals', emoji: '🦁', words: w('Elephant,Penguin,Giraffe,Octopus,Kangaroo,Dolphin,Chameleon,Panda,Flamingo,Hedgehog,Platypus,Crocodile,Owl,Koala,Sloth,Peacock,Hippo,Wolf,Seahorse,Camel') },
  { id: 'food', name: 'Food', emoji: '🍕', words: w('Pizza,Sushi,Pierogi,Hamburger,Tacos,Spaghetti,Ice Cream,Pancakes,Croissant,Popcorn,Chocolate,Kebab,Lasagna,Ramen,Donut,Guacamole,Pretzel,Hot Dog,Cheesecake,Paella') },
  { id: 'famous', name: 'Famous People', emoji: '🏛️', words: w('Albert Einstein,Leonardo da Vinci,Cleopatra,Napoleon,Marie Curie,Nelson Mandela,Elon Musk,Steve Jobs,Mozart,Shakespeare,Isaac Newton,Frida Kahlo,Abraham Lincoln,Nikola Tesla,Martin Luther King Jr,Pablo Picasso,Amelia Earhart,Genghis Khan,Charles Darwin,Mahatma Gandhi') },
  { id: 'games', name: 'Video Games', emoji: '🎮', words: w('Minecraft,Super Mario,Fortnite,Tetris,Pac-Man,The Legend of Zelda,Among Us,Pokémon,Sonic,Grand Theft Auto,Fifa,Overwatch,Portal,Skyrim,The Sims,Roblox,Counter-Strike,Doom,Animal Crossing,Elden Ring') },
  { id: 'countries', name: 'Countries', emoji: '🌍', words: w('Poland,Brazil,Japan,Egypt,Australia,Canada,Italy,Mexico,Norway,India,Kenya,Argentina,Iceland,Thailand,Greece,Peru,Switzerland,New Zealand,Morocco,Vietnam') },
  { id: 'objects', name: 'Objects', emoji: '🧸', words: w('Umbrella,Toothbrush,Skateboard,Lighthouse,Vacuum Cleaner,Telescope,Backpack,Hourglass,Piano,Scissors,Compass,Microwave,Bicycle,Candle,Mirror,Ladder,Headphones,Globe,Anchor,Trampoline') },
  { id: 'sports', name: 'Sports', emoji: '⚽', words: w('Football,Basketball,Tennis,Swimming,Volleyball,Golf,Boxing,Skiing,Surfing,Fencing,Archery,Rugby,Table Tennis,Cycling,Gymnastics,Baseball,Ice Hockey,Judo,Rowing,Snowboarding') },
];
