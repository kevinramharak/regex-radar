[
  ;; match a variable declaration with a preceding doc comment containing a @regex tag
  ;; /** @regex */ const pattern = "pattern";
  ;; /** @regex */ let pattern = "pattern";
  ;; /** @regex */ var pattern = "pattern";
  (
    (comment) @comment
    .
    (
      declaration
        (variable_declarator
        value: (
          string
          (_)+ @regex.pattern
        ) @regex @regex.string
      )
    )
    (#match? @comment "^/\\*\\*")
    (#match? @comment "(:?\\s|\\/\\*\\*)@regex(:?\\s|\\*\\/)")
  )
  ;; match a string literal with a preceding doc comment containing a @regex tag
  ;; /** @regex */ "pattern"
  ;; /** @regex*/ "pattern"
  ;; /**@regex */ "pattern"
  ;; /**@regex*/ "pattern"
  (
    (comment) @comment
    .
    (
      string
      (_)+ @regex.pattern
    ) @regex @regex.string
    (#match? @comment "^/\\*\\*")
    (#match? @comment "(:?\\s|\\/\\*\\*)@regex(:?\\s|\\*\\/)")
  )
]