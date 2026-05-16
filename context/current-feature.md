# Current Feature


## This Document
This document relates to information specific to the current feature that is being designed and implemented.

## Feature Description
The entry point of the application. When the user first opens the app, they will set up the conjugations they would like to practice and press a submit button, which in turn will make an API call to the practice endpoint and return the results.

## Guidelines
When the user first enters the webapp they will be displayed with a screen which lists all of the verbs and tenses that they wish to practice. This should be two columns - one for the list of verbs and one for the list of tenses. All verbs should be checked and there will be a button which allows the user to uncheck all verbs if any of the verbs are already checked, and also check all verbs if all are currently unchecked. The verbs and their ID numbers can be obtained from the /verbs endpoint.

The tenses should only initially be checked for Presente, Pretérito Indefinido, Pretérito Imperfecto, and Futuro Simple which are the names of four of the results that will be returned from the /tenses endpoint. Again, the same check/uncheck functionality should also apply for the list of tenses where the user can uncheck all tenses if any are checked, and also check all tenses if they are all currently unchecked. This is the same type of funcionality as the verbs, but should be independent of the verbs check/uncheck button.

The user will then click submit which will make an API call to the /practice endpoint - Example: /practice?verbs=1,3,4&tenses=1,2,3,4&pronouns=1,2,3,4. 

This will return a JSON body which will contain an array called data that has 20 results. The result looks like:

{
	"id": integer,
	"infinite":string,
	"mood": string,
	"tense": string,
	"pronoun": string,
	"conjugation": string
}

This will be what the user then interacts with to practice. This will replace the current call to the /conjugations endpoint that is currently in place. 

The header will also need to be updated to remove the buttons and the functionality which is currently in place for selecting verbs and tenses. Thise will need to be replaced with a "Settings" button which when clicked will display a modal containing all the same information which the user is presented with upon first entering the webapp so that they can update their choices and submit a new call to the API to return more results.

## Styling Specifications
This should use the same styling guidelines as the rest of the application.