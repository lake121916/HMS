import { L as createComponent, V as createMemo, a as getPreferredColorScheme } from "./utils-Fz9uQv9N.js";
import { a as PiPProvider, c as createLocalStorage, i as ThemeContext, n as Devtools, o as QueryDevtoolsContext } from "./Devtools-xfqOl5Dl.js";
//#region src/DevtoolsComponent.tsx
const DevtoolsComponent = (props) => {
	const [localStore, setLocalStore] = createLocalStorage({ prefix: "TanstackQueryDevtools" });
	const colorScheme = getPreferredColorScheme();
	const theme = createMemo(() => {
		const preference = props.theme || localStore.theme_preference || "system";
		if (preference !== "system") return preference;
		return colorScheme();
	});
	return createComponent(QueryDevtoolsContext.Provider, {
		value: props,
		get children() {
			return createComponent(PiPProvider, {
				localStore,
				setLocalStore,
				get children() {
					return createComponent(ThemeContext.Provider, {
						value: theme,
						get children() {
							return createComponent(Devtools, {
								localStore,
								setLocalStore
							});
						}
					});
				}
			});
		}
	});
};
//#endregion
export { DevtoolsComponent as default };
