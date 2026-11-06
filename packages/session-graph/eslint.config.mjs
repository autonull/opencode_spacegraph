import eslint from "@eslint/js"
import tseslint from "typescript-eslint"
import { globSync } from "glob"

const componentTestFiles = globSync("component-tests/**/*.spec.ts")

export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        ignores: ["dist/", "node_modules/"],
    },
    {
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
            "no-constant-condition": ["warn", { checkLoops: false }],
        },
    },
    {
        files: componentTestFiles,
        rules: {
            "no-story-skip-without-issue": "error",
        },
    },
    {
        plugins: {
            "story-lint": {
                rules: {
                    "no-story-skip-without-issue": {
                        meta: {
                            type: "problem",
                            docs: {
                                description: "Disallow story.skip/story.fixme without an issue URL",
                            },
                            schema: [],
                            messages: {
                                missingIssue: "story.skip/story.fixme must include an issue URL in annotation: { annotation: { type: 'issue', description: '...', url: 'https://...' } }",
                            },
                        },
                        create(context) {
                            return {
                                CallExpression(node) {
                                    if (node.callee.type === "MemberExpression" &&
                                        node.callee.object.type === "Identifier" &&
                                        node.callee.object.name === "story" &&
                                        (node.callee.property.type === "Identifier" &&
                                            (node.callee.property.name === "skip" || node.callee.property.name === "fixme"))) {

                                        let hasIssueAnnotation = false
                                        if (node.arguments.length >= 2 &&
                                            node.arguments[1].type === "ObjectExpression") {
                                            const annotation = node.arguments[1].properties.find(
                                                p => p.type === "Property" &&
                                                    p.key.type === "Identifier" &&
                                                    p.key.name === "annotation" &&
                                                    p.value.type === "ObjectExpression"
                                            )
                                            if (annotation && annotation.value.type === "ObjectExpression") {
                                                const typeProp = annotation.value.properties.find(
                                                    p => p.type === "Property" &&
                                                        p.key.type === "Identifier" &&
                                                        p.key.name === "type" &&
                                                        p.value.type === "Literal" &&
                                                        p.value.value === "issue"
                                                )
                                                const urlProp = annotation.value.properties.find(
                                                    p => p.type === "Property" &&
                                                        p.key.type === "Identifier" &&
                                                        p.key.name === "url" &&
                                                        p.value.type === "Literal"
                                                )
                                                if (typeProp && urlProp) {
                                                    hasIssueAnnotation = true
                                                }
                                            }
                                        }

                                        if (!hasIssueAnnotation) {
                                            context.report({
                                                node,
                                                messageId: "missingIssue",
                                            })
                                        }
                                    }
                                },
                            }
                        },
                    },
                },
            },
        },
    },
)