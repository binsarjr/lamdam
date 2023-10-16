import React, { ReactNode } from 'react';

type ExportState<T = any> = {
    data: T[];
    canExport: boolean;
}

type ExportAction<T = any> = {
    type: 'add' | 'remove' | 'clear' | 'setCanExport';
    payload: T;
}

type Dispatch = (action: ExportAction) => void

const ExportContext = React.createContext<{
    state: ExportState;
    dispatch: Dispatch;
} | undefined>(undefined)

export type ExportConsumerProps<T = any> = {
    addData: (newData: T) => void,
    removeData: (index: number) => void,
    clearData: () => void,
    canExport: boolean,
    exportData: T[]
}

const exportReducer = (state: ExportState, action: ExportAction): ExportState => {
    switch (action.type) {
        case 'add': {
            const data = [...state.data];
            data.push(action.payload);
            return { ...state, data };
        }
        case 'remove': {
            const newData = [...state.data];
            newData.splice(action.payload, 1);
            return { ...state, data: newData };
        }
        case 'clear': {
            return { ...state, data: [] };
        }
        case 'setCanExport': {
            return { ...state, canExport: action.payload };
        }
        default: {
            throw new Error(`Unhandled action type: ${action.type}`);
        }
    }
}

const ExportProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, dispatch] = React.useReducer(exportReducer, { data: [], canExport: false })

    return (
        <ExportContext.Provider value={{ state, dispatch }}>
            {children}
        </ExportContext.Provider>
    );
};

export const ExportConsumer = <T,>({ children }: { children: (context: ExportConsumerProps<T>) => ReactNode }) => {
    return (
        <ExportContext.Consumer>
            {context => {
                if (context === undefined) {
                    throw new Error('ExportConsumer must be used within a ExportProvider')
                }

                const addData = (newData: T) => {
                    context.dispatch({ type: 'add', payload: newData });
                }

                const removeData = (index: number) => {
                    context.dispatch({ type: 'remove', payload: index });
                }

                const clearData = () => {
                    context.dispatch({ type: 'clear', payload: null });
                }

                return children({
                    addData,
                    removeData,
                    clearData,
                    canExport: context.state.canExport,
                    exportData: context.state.data as T[]
                });
            }}
        </ExportContext.Consumer>
    )
}

export const useExport = <T,>() => {
    const context = React.useContext(ExportContext)
    if (context === undefined) {
        throw new Error('useExport must be used within a ExportProvider')
    }

    const addData = (newData: T) => {
        context.dispatch({ type: 'add', payload: newData });
    }

    const removeData = (index: number) => {
        context.dispatch({ type: 'remove', payload: index });
    }

    const clearData = () => {
        context.dispatch({ type: 'clear', payload: null });
    }

    const setCanExport = (canExport: boolean) => {
        context.dispatch({ type: 'setCanExport', payload: canExport });
    }

    return {
        addData,
        removeData,
        clearData,
        setCanExport,
        canExport: context.state.canExport,
        exportData: context.state.data as T[]
    }
}

export default ExportProvider;
