$.Synonyms = function (el, options) {
    this.$el = $(el);

    //Disable resizable elements in a contenteditable div for Firefox
    //Firefox ESR 38.5.2 throws an NS_ERROR_FAILURE when this is called, so
    //do it if we can but roll with it otherwise.
    try {
        document.execCommand("enableObjectResizing", false, "false");
    }
    catch(err) {
        console.log("error in disabling eneableObjectResizing");
    }

    // document.execCommand("insertBrOnReturn", false, "false");

    this.thesaurusRaw = options.thesaurusRaw;
    this.settings = {
        trimSynonyms: options.trimSynonyms || true,
        maxSynonyms: options.maxSynonyms || 6,
        shuffleSynonyms: options.shuffleSynonyms || true,
        replaceCallback: options.replaceCallback,
        characterCountLimit: options.characterCountLimit || undefined,
    };

    this.buildThesaurus();
    this.tagSynonyms(this.$el.get(0));

    this.$el.on('keyup keydown', function (event) {
        var code = event.which;

        // BACKSPACE || "."
        if (code === 8 || code === 46) {
            $(document).find('.synonym-list').hide();
            if (this.val() == '') {
                //Prevent insertion of u tag if first word is matched synonym, then deleted
                this.resetCaret(this.$el.get(0));
                this.$el.find('br').remove();
            } else {
                this.removeSpan();
            }
        // NULL || SPACE
        } else if (code === 0 || code === 32) {
            this.escapeSpan();
        }

        var isPrintableCharacter =
            (code > 47 && code < 58)   || // number keys
            code == 32                 || // spacebar
            code == 13                 || // return key(s) (if you want to allow carriage returns)
            (code > 64 && code < 91)   || // letter keys
            (code > 95 && code < 112)  || // numpad keys
            (code > 185 && code < 193) || // ;=,-./` (in order)
            (code > 218 && code < 223);   // [\]' (in order)

        // if the new keydown is alphanumeric, without modifier keys, and the
        // character limit has been reached already, then ignore the event.
        if (isPrintableCharacter &&
            !( event.ctrlKey || event.metaKey || event.altKey ) &&
            (this.settings.characterCountLimit !== undefined) &&
            this.val().length >= this.settings.characterCountLimit) {
            event.preventDefault();
        }

        this.tagSynonyms(this.$el.get(0));
    }.bind(this));

    if (this.method === 'ajax') {
        this.lookup = this.ajaxLookup;
    }

    //Firefox Support:  Firefox inserts brs whenever text nodes are inserted
    this.$el.find('br').remove();
    //Public function, replicates functionality of val for a textarea
    //strips synonym suggestions and returns value of all text nodes and spans
    this.val = function (text) {
        if (text === undefined) {
            return this.$el
                       .ignore('ul')
                       .text()
                       .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '');
        } else {
            this.$el.text(text);
        }
    }.bind(this);
};

$.Synonyms.prototype.buildThesaurus = function () {
    this.thesaurus = {};
    $.each(this.thesaurusRaw, function (listIdx) {
        $.each(this.thesaurusRaw[listIdx], function(wordIdx, word) {
            synonyms = this.thesaurusRaw[listIdx].slice();
            synonyms.splice(wordIdx, 1);
            this.thesaurus[word] = synonyms;
        }.bind(this));
    }.bind(this));
};

$.Synonyms.prototype.lookup = function (word) {
    return this.thesaurus[word.toLowerCase()];
};

//TODO: Implement ability to parse words to back end
$.Synonyms.prototype.ajaxLookup = function (word) {

};

//After inserting an element, this function will move caret to next text node
$.Synonyms.prototype.placeCaretAfterNode = function (node) {
    var range = document.createRange(),
        sel = window.getSelection(),
        textNode;
    range.setStartAfter(node);

    //If adjacent text node jump to it, else create one with an invisible character and jump to it
    if (node.nextSibling.data.length > 0) {
        range.setStart(node.nextSibling, 1);
    } else {
        textNode = document.createTextNode('\u200B');
        range.insertNode(textNode);
        range.setStartAfter(textNode);
    }

    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
};

$.Synonyms.prototype.resetCaret = function (node) {
    var range = document.createRange(),
        sel = window.getSelection();
    range.selectNodeContents(node);

    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
};

//check if we are currently in a span and traverse into an adjacent text node if so
$.Synonyms.prototype.escapeSpan = function () {
    var range, sel;
    if (window.getSelection) {
        sel = window.getSelection();
        if (sel.getRangeAt) {
            if (sel.rangeCount > 0) {
                range = sel.getRangeAt(0);
            }
        }
    }

    if (range) {
        container = range.commonAncestorContainer;
        if (container.nodeType === 3 && container.parentNode.nodeName === 'SPAN') {
            this.placeCaretAfterNode(container.parentNode);
        }
    }
};

//For Firefox, tagged word backspace functionality
//TODO:  Make this more consistent across browsers in future,
$.Synonyms.prototype.removeSpan = function () {
    var sel = window.getSelection(),
        range = document.createRange(),
        newText,
        parentSpan;

    if (sel.anchorNode.parentNode.nodeName === 'LI') {
        parentSpan = sel.anchorNode.parentNode.parentNode.parentNode;

        //get just the text of the span without the last character
        newText = $(parentSpan)
            .clone()
            .children()
            .remove()
            .end()
            .text()
            .slice(0, -1);

        $(parentSpan).removeClass('tagged');
        parentSpan.textContent = newText;
        range.setStartAfter(parentSpan);

        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
    }
};

$.Synonyms.prototype.tagSynonyms = function (node) {
    var child = node.firstChild;

    while (child) {
        //if child is a text node
        if (child.nodeType == 3) {
            $.each(child.data.split(" "), function (idx, word) {
                var synonyms = this.lookup(word),
                    newTextNode,
                    $taggedWord;
                if (synonyms) {
                    newTextNode = child.splitText(child.data.indexOf(word));
                    child = newTextNode;
                    synonyms = this.settings.shuffleSynonyms ? this.shuffleSynonyms(synonyms) : synonyms;
                    synonyms = this.settings.trimSynonyms ? this.trimSynonyms(synonyms) : synonyms;
                    $taggedWord = this.tagAndAttachEventHandlerToWord(synonyms, word);
                    child.parentNode.insertBefore($taggedWord.get(0), child);
                    child.data = child.data.replace(word, '');
                    this.placeCaretAfterNode($taggedWord.get(0));
                }
            }.bind(this));
        }

        child = child.nextSibling;
    }

    return node;
};

$.Synonyms.prototype.tagAndAttachEventHandlerToWord = function (synonyms, word) {
    var $synonymList = $('<ul class="synonym-list">'),
        _this = this,
        $taggedWord;

    $.each(synonyms, function (idx, synonym) {
        $synonymList.append($('<li>').text(synonym).on('click', function () {
            if (_this.settings.replaceCallback) {
                _this.settings.replaceCallback(word, synonym);
            }

            $(this).closest('.tagged')
                   .text($(this).text())
                   .removeClass('tagged')
                   .addClass('replaced');
        }));
    });

    $synonymList.hide();
    $taggedWord = $('<span class="tagged" spellcheck="false">')
        .text(word)
        .append($synonymList);
    $taggedWord.on('click', function () {
        $(document).find('.synonym-list').hide();
        $(this).find('.synonym-list').show();

    });

    return $taggedWord;
};

$.Synonyms.prototype.shuffleSynonyms = function (synonyms) {
    var currentIdx = synonyms.length,
        temp,
        randomIdx;

    while (0 !== currentIdx) {
        randomIdx = Math.floor(Math.random() * currentIdx);
        currentIdx -= 1;
        temp = synonyms[currentIdx];
        synonyms[currentIdx] = synonyms[randomIdx];
        synonyms[randomIdx] = temp;
    }

    return synonyms;
};

$.Synonyms.prototype.trimSynonyms = function (synonyms) {
    if (synonyms.length > this.settings.maxSynonyms) {
        synonyms = synonyms.slice(0, this.settings.maxSynonyms);
    }

    return synonyms;
};

//Credit to http://stackoverflow.com/a/11348383 for this function
$.fn.ignore = function (sel) {
    return this.clone().find(sel||">*").remove().end();
};

$.fn.synonyms = function (options) {
    return this.each(function () {
        if ($(this).data('synonyms') === undefined) {
            var synonyms = new $.Synonyms(this, options);
            $(this).data('synonyms', synonyms);
        }
    });
};
