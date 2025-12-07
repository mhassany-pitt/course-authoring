const TYPES_MAPPING: any = {
    "animatedexamples": "Animated Example",
    "animated_example": "Animated Example",
    "educvideos": "Educational Video",
    "example": "Example",
    "lesslet": "LessLet",
    "mchq": "Multiple Choice Questions (MCHQ)",
    "opendsa_problems": "OpenDSA Problem",
    "opendsa_slideshows": "OpenDSA Slideshow",
    "parsons": "Parsons Problem",
    "pcex_set": "PCEX Set",
    "pcex_activity": "PCEX Activity",
    "pcex_challenge": "PCEX Challenge",
    "pcrs": "Programming Course Resource System (PCRS)",
    "question": "Question",
    "readingmirror": "ReadingMirror"
};

const AUTHOR_NAMES_MAPPING: any = {
    "admin": "Administrator",
    "Akhuseyinoglu": "Kamil Akhuseyinoglu",
    "akhuseyinoglu": "Kamil Akhuseyinoglu",
    "akhuseyinoglu&Thea Wang": "Kamil Akhuseyinoglu & Thea Wang",
    "akhuseyinoglu&theawang": "Kamil Akhuseyinoglu & Thea Wang",
    "Thea Wang & Kamil Akhuseyinoglu": "Kamil Akhuseyinoglu & Thea Wang",
    "Arun Balajiee": "Arun Balajiee Lekshmi Narayanan",
    "arunb": "Arun Balajiee Lekshmi Narayanan",
    "arunb & rully": "Arun Balajiee Lekshmi Narayanan & Rully Hendrawan",
    "cayhorstmann": "Cay Horstmann",
    "jab464": "Jordan Barria-Pineda",
    "Jordan Ariel Barria Pineda": "Jordan Barria-Pineda",
    "Jordan Barria": "Jordan Barria-Pineda",
    "Natalya": "Natalya Goreva",
    "odg4": "Oliver Gladys",
    "rully": "Rully Hendrawan",
    "rah225": "Rully Hendrawan",
};

const AUTHOR_IDNAMES_MAPPING: any = {
    "admin": "Administrator",
    "akhuseyinoglu": "Kamil Akhuseyinoglu",
    "dguerra": "Daniel Guerra",
    "h.chau": "Hung Chau",
    "hmshrque": "Hasan Mashrique",
    "mhassany": "Mohammad Hassany",
    "rah225": "Rully Hendrawan",
    "yuh43": "Yun Huang",
};

export const transform = (content: any): any => {
    if (content.provider_id == "webex" && (
        content.author_id == "py.teacher" || content.domain_id == "c"
    )) {
        content.author_id = "peterb";
        content.author_name = "Peter Brusilovsky";
    }

    if (content.type in TYPES_MAPPING) {
        content.type = TYPES_MAPPING[content.type];
    }

    if (content.author_id in AUTHOR_IDNAMES_MAPPING) {
        content.author_name = AUTHOR_IDNAMES_MAPPING[content.author_id];
    } else if (content.author_name in AUTHOR_NAMES_MAPPING) {
        content.author_name = AUTHOR_NAMES_MAPPING[content.author_name];
    }

    if (content.provider_id == "pcex_activity") {
        content.provider_name = "PCEX Activity";
    }

    if (content.author_name == 'Administrator') {
        // Animated Examples are by Teemu Sirkiä
        if (content.type == 'Animated Example') {
            content.author_id = 'sirkia';
            content.author_name = 'Sirkiä Teemu';
        }
        // Parsons Problems are by Lassi Haaranen
        else if (content.type == 'Parsons Problem') {
            content.author_id = 'haaranel';
            content.author_name = 'Haaranen Lassi';
        }
        // administrator-quizjet with meaningful name is by Sharon Hsiao
        else if (content.provider_id == 'quizjet' && !content.name.startsWith('subproblem ')) {
            content.author_id = 'sharon';
            content.author_name = 'Sharon Hsiao';
        }
    }

    return content;
};

export const filter = (content: any): boolean => {
    if (content.provider_id == "pcex_activity" &&
        content.author_id == "moh70@pitt.edu" &&
        content.creation_date?.toISOString()?.startsWith('2024-08-22')) {
        // exclude duplicate pcex contents (from pcex_v1/v2 migration to weat)
        return false;
    }

    return ![
        { type: "animated_example", domain_id: "sql" },
        { type: "animatedexamples", domain_id: "sql" },
        { type: "lesslet" },
        { type: "mchq", domain_id: "telcom" },
        { type: "educvideos" },
    ].some(e => Object.keys(e).every(k => content[k] === e[k]));
};
