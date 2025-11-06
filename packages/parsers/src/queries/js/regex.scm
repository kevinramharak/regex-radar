[
  ;; match regex literal expressions:
  ;; /pattern/gi
  ;; /pattern/
  (regex
    pattern: (regex_pattern) @regex.pattern
    flags: (regex_flags)? @regex.flags
  ) @regex @regex.literal
  ;; match regex constructor calls:
  ;; new RegExp("pattern", "gi")
  ;; new RegExp("pattern")
  ;; TODO: new RegExp(/pattern/, "gi")
  (new_expression
    constructor: (identifier) @regex.constructor
    arguments: (arguments
      .
      (string
        (_)+ @regex.pattern
      )
      (string
        (_)+ @regex.flags
      )?
    )
    (#eq? @regex.constructor "RegExp")
  ) @regex
  ;; match regex function calls:
  ;; RegExp("pattern", "gi")
  ;; RegExp("pattern")
  ;; TODO: RegExp(/pattern/, "gi")
  (call_expression
    function: (identifier) @regex.function
    arguments: (arguments
      .
      (string
        (_)+ @regex.pattern
      )
      (string
        (_)+ @regex.flags
      )?
    )
    (#eq? @regex.function "RegExp")
  ) @regex
  ;; TODO: dynamic regex patterns and flags
]