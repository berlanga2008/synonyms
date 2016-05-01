# jquery-synonyms
A jQuery plugin for tagging and replacing words.

[Check out the demo here.](http://andrewjgremmo.github.io/synonyms)

![synonyms](https://cloud.githubusercontent.com/assets/6382796/14942451/7e7c5dac-0f8b-11e6-88b3-351a75dea259.gif)

## Usage
Simply call `.synonyms(options = {})` on any div that has `contenteditable=true`.
In the current version, the thesaurus that the plugin uses must be frontloaded with replacement words.  A future version will have the ability to query an API.

As such, the following option is currently mandatory to pass:
###### thesaurusRaw (example: `[['happy', 'cheerful', 'delighted'], ['eager', 'enthusiastic', 'thrilled']]`)
Pass an array of arrays, each containing synonyms.  If a word is matched in any of the subarrays, the suggested replacement words will be the other words in the array it was passed with.


### Options

###### trimSynonyms (default: true)
If this is set to true, a maximum # of synonyms will be provided per tagged word.
###### maxSynonyms (default: 6)
The maximum number of synonyms that will be provided per tagged word.
###### shuffleSynonyms (default: true)
If this is set to true, the synonyms provided for each tagged word will be shuffled, such that with a sufficient number of synonyms provided, the suggestion list won't be the same for each instance of the word.
###### replaceCallback (default: undefined)
Pass a callback function that gets called each time a word replacement is completed.  The function is passed two strings, the initial word and the replacement word.
###### characterLimit (default: undefined)
As using contenteditable prevents enforcing a character limit, like a textarea can, if you want to enforce a character limit, pass an integer here.

## Changelog

### v1.0.0
* Initial release
