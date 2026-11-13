import { c as useT, i as T } from "./i18n-CjINbfYr.js";
import { t as market_categories_public_default } from "./market_categories_public-DiCfJHFl.js";
import { useState } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region src/MarketCategories.jsx
function MarketCategories({ onSelection = () => {} }) {
	const fmt = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 }), t = useT(), [category, setCategory] = useState(market_categories_public_default.categories[0].id), [tag, setTag] = useState("ALL");
	const current = market_categories_public_default.categories.find((c) => c.id === category), metrics = current.audited_latest_trade, species = current.species.filter((s) => tag === "ALL" || s.tags.includes(tag));
	return /* @__PURE__ */ jsxs("section", {
		className: "source-panel",
		"aria-labelledby": "market-categories-heading",
		children: [
			/* @__PURE__ */ jsx("p", {
				className: "eyebrow",
				children: /* @__PURE__ */ jsx(T, { children: "European seed market" })
			}),
			/* @__PURE__ */ jsx("h2", {
				id: "market-categories-heading",
				children: /* @__PURE__ */ jsx(T, { children: "10 seed categories" })
			}),
			/* @__PURE__ */ jsxs("p", { children: [
				"2026-06 · ",
				/* @__PURE__ */ jsx(T, { children: "Monthly seed-for-sowing trade" }),
				" · ",
				/* @__PURE__ */ jsx(T, { children: "40 CN codes" })
			] }),
			/* @__PURE__ */ jsxs("p", { children: [
				"16 ",
				/* @__PURE__ */ jsx(T, { children: "Direct species scope" }),
				" · 4 ",
				/* @__PURE__ */ jsx(T, { children: "Partial species scope" }),
				" · 78 ",
				/* @__PURE__ */ jsx(T, { children: "Group-level evidence" }),
				" · 23 ",
				/* @__PURE__ */ jsx(T, { children: "Trade evidence gap" })
			] }),
			/* @__PURE__ */ jsx("p", { children: /* @__PURE__ */ jsx(T, { children: "Choose a seed category. Use tags are secondary filters; customs groups are never allocated to individual species." }) }),
			/* @__PURE__ */ jsx("div", {
				style: {
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,190px),1fr))",
					gap: 8
				},
				children: market_categories_public_default.categories.map((c) => /* @__PURE__ */ jsxs("button", {
					type: "button",
					"aria-pressed": c.id === category,
					onClick: () => {
						setCategory(c.id);
						onSelection({ category: c.id });
					},
					style: {
						padding: "12px",
						textAlign: "left",
						border: "1px solid #d5e1df",
						borderRadius: 8,
						background: c.id === category ? "#e9f5f0" : "white",
						minHeight: 72
					},
					children: [
						/* @__PURE__ */ jsx("strong", { children: t(c.name) }),
						/* @__PURE__ */ jsx("br", {}),
						/* @__PURE__ */ jsxs("small", { children: [
							c.species_count,
							" ",
							t("seed species"),
							" · ",
							c.commercial_entity_count,
							" ",
							t("Market entities"),
							/* @__PURE__ */ jsx("br", {}),
							c.trade_entity_count,
							" ",
							t("Trade Market Entities"),
							c.latest_verified_period && /* @__PURE__ */ jsxs(Fragment, { children: [" · ", c.latest_verified_period] })
						] })
					]
				}, c.id))
			}),
			/* @__PURE__ */ jsxs("details", { children: [
				/* @__PURE__ */ jsx("summary", { children: /* @__PURE__ */ jsx(T, { children: "Unallocated customs scope" }) }),
				/* @__PURE__ */ jsxs("p", { children: [
					fmt.format(Number(market_categories_public_default.category_unallocated.unallocated_kg) / 1e3),
					" t · €",
					fmt.format(Number(market_categories_public_default.category_unallocated.unallocated_eur)),
					" · CN ",
					market_categories_public_default.category_unallocated.unallocated_cn_codes.join(", ")
				] }),
				/* @__PURE__ */ jsx("p", { children: /* @__PURE__ */ jsx(T, { children: "Included in the headline, not assigned to one commercial category." }) })
			] }),
			/* @__PURE__ */ jsx("h3", { children: t(current.name) }),
			metrics && /* @__PURE__ */ jsxs("dl", {
				className: "production-kpis",
				style: { gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,160px),1fr))" },
				children: [
					/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("dt", { children: /* @__PURE__ */ jsx(T, { children: "Trade volume" }) }), /* @__PURE__ */ jsx("dd", { children: metrics.volume_tonnes == null ? t("Trade evidence gap") : `${fmt.format(metrics.volume_tonnes)} t` })] }),
					/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("dt", { children: /* @__PURE__ */ jsx(T, { children: "Trade value" }) }), /* @__PURE__ */ jsx("dd", { children: metrics.trade_value_eur == null ? t("Trade evidence gap") : `€${fmt.format(metrics.trade_value_eur)}` })] }),
					/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("dt", { children: /* @__PURE__ */ jsx(T, { children: "Contributing CN codes" }) }), /* @__PURE__ */ jsx("dd", { children: metrics.cn_count })] }),
					/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("dt", { children: /* @__PURE__ */ jsx(T, { children: "Direct species scope" }) }), /* @__PURE__ */ jsx("dd", { children: metrics.directly_supported_full_scope_species })] })
				]
			}),
			/* @__PURE__ */ jsx("p", { children: /* @__PURE__ */ jsx(T, { children: "Monthly category totals use compatible CN scopes only. Cross-category groups and beet crop types remain unallocated." }) }),
			/* @__PURE__ */ jsxs("label", { children: [/* @__PURE__ */ jsx(T, { children: "Use tag" }), /* @__PURE__ */ jsxs("select", {
				value: tag,
				onChange: (e) => setTag(e.target.value),
				style: {
					maxWidth: "100%",
					minHeight: 44,
					marginLeft: 8
				},
				children: [/* @__PURE__ */ jsx("option", {
					value: "ALL",
					children: t("All uses")
				}), [
					"CATCH_CROP",
					"COVER_CROP",
					"FORAGE",
					"GREEN_MANURE",
					"POLLINATOR"
				].map((x) => /* @__PURE__ */ jsx("option", {
					value: x,
					children: t(x)
				}, x))]
			})] }),
			/* @__PURE__ */ jsx("p", { children: /* @__PURE__ */ jsx(T, { children: "Category links indicate customs scope, not a measured contribution. Category trade totals are withheld where groups span categories." }) }),
			/* @__PURE__ */ jsx("ul", {
				style: { paddingLeft: 20 },
				children: species.map((s) => /* @__PURE__ */ jsxs("li", {
					style: {
						padding: "8px 0",
						overflowWrap: "anywhere"
					},
					children: [
						/* @__PURE__ */ jsx("strong", { children: t(s.name) }),
						" ",
						s.botanical && /* @__PURE__ */ jsxs(Fragment, { children: [
							"(",
							/* @__PURE__ */ jsx("i", { children: s.botanical }),
							")"
						] }),
						" — ",
						t(s.evidence_precision === "DIRECT" ? "Direct species scope" : s.evidence_precision === "PARTIAL" ? "Partial species scope" : s.evidence_precision === "GROUP_LEVEL" ? "GROUP-LEVEL TRADE DATA — INCLUDES MULTIPLE SPECIES" : "Trade evidence gap"),
						" ",
						s.cn_codes.length > 0 && /* @__PURE__ */ jsx("span", { children: s.cn_codes.map((code) => /* @__PURE__ */ jsxs("button", {
							type: "button",
							onClick: () => onSelection({
								category: current.id,
								entity: "CN-" + code
							}),
							style: {
								margin: 4,
								padding: 4
							},
							children: [
								"CN ",
								code,
								" →"
							]
						}, code)) })
					]
				}, s.id))
			}),
			!species.length && /* @__PURE__ */ jsx("p", { children: /* @__PURE__ */ jsx(T, { children: "No true-seed species in this selection. Vegetative propagation remains separate." }) })
		]
	});
}
//#endregion
export { MarketCategories as default };
