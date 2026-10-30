## JIKAN REST API
https://api.jikan.moe/v4/

## getAnimeSearch
get /anime
unapproved
boolean
This is a flag. When supplied it will include entries which are unapproved. Unapproved entries on MyAnimeList are those that are user submitted and have not yet been approved by MAL to show up on other pages. They will have their own specifc pages and are often removed resulting in a 404 error. You do not need to pass a value to it. e.g usage: ?unapproved

page integer
limit integer
q string
type
string (anime_search_query_type)
Enum "TV" "OVA" "Movie" "Special" "ONA" "Music" "CM" "PV" "TV Special"
score number
min_score number
Set a minimum score for results.
max_score number
Set a maximum score for results.
status string
(anime_search_query_status)
Available Anime statuses
Enum "airing" "complete" "upcoming"

ating
string
(anime_search_query_rating)
Available Anime audience ratings

Ratings
G - All Ages
PG - Children
PG-13 - Teens 13 or older
R - 17+ (violence & profanity)
R+ - Mild Nudity
Rx - Hentai

Enum
"g"
"pg"
"pg13"
"r17"
"r"
"rx"
sfw
boolean
Filter out Adult entries

genres
string
Filter by genre(s) IDs. Can pass multiple with a comma as a delimiter. e.g 1,2,3

genres_exclude
string
Exclude genre(s) IDs. Can pass multiple with a comma as a delimiter. e.g 1,2,3

order_by
string
(anime_search_query_orderby)
Available Anime order_by properties

Enum
"mal_id"
"title"
"start_date"
"end_date"
"episodes"
"score"
"scored_by"
"rank"
"popularity"
"members"
+1 more
sort
string
(search_query_sort)
Search query sort direction

Enum
"desc"
"asc"
letter
string
Return entries starting with the given letter

producers
string
Filter by producer(s) IDs. Can pass multiple with a comma as a delimiter. e.g 1,2,3

start_date
string
Filter by starting date. Format: YYYY-MM-DD. e.g 2022, 2005-05, 2005-01-01

end_date
string
Filter by ending date. Format: YYYY-MM-DD. e.g 2022, 2005-05, 2005-01-01


## getMangaSearch
get /manga
unapproved
boolean
This is a flag. When supplied it will include entries which are unapproved. Unapproved entries on MyAnimeList are those that are user submitted and have not yet been approved by MAL to show up on other pages. They will have their own specifc pages and are often removed resulting in a 404 error. You do not need to pass a value to it. e.g usage: ?unapproved

page
integer
limit
integer
q
string
type
string
(manga_search_query_type)
Available Manga types

Enum
"manga"
"novel"
"lightnovel"
"oneshot"
"doujin"
"manhwa"
"manhua"
score
number
min_score
number
Set a minimum score for results.

max_score
number
Set a maximum score for results

status
string
(manga_search_query_status)
Available Manga statuses

Enum
"publishing"
"complete"
"hiatus"
"discontinued"
"upcoming"
sfw
boolean
Filter out Adult entries

genres
string
Filter by genre(s) IDs. Can pass multiple with a comma as a delimiter. e.g 1,2,3

genres_exclude
string
Exclude genre(s) IDs. Can pass multiple with a comma as a delimiter. e.g 1,2,3

order_by
string
(manga_search_query_orderby)
Available Manga order_by properties

Enum
"mal_id"
"title"
"start_date"
"end_date"
"chapters"
"volumes"
"score"
"scored_by"
"rank"
"popularity"
+2 more
sort
string
(search_query_sort)
Search query sort direction

Enum
"desc"
"asc"
letter
string
Return entries starting with the given letter

magazines
string
Filter by magazine(s) IDs. Can pass multiple with a comma as a delimiter. e.g 1,2,3

start_date
string
Filter by starting date. Format: YYYY-MM-DD. e.g 2022, 2005-05, 2005-01-01

end_date
string
Filter by ending date. Format: YYYY-MM-DD. e.g 2022, 2005-05, 2005-01-01