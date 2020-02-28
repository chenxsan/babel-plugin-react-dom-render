import { PluginObj } from '@babel/core';
import { Program, ExportDefaultDeclaration } from '@babel/types';

import { NodePath } from '@babel/traverse';

interface State {
  opts: {
    root?: string;
    hydrate?: boolean;
  };
}
export default function(babel: any): PluginObj<State> {
  const t = babel.types;
  return {
    visitor: {
      Program: {
        enter(path: NodePath<Program>): void {
          if (path.scope.hasBinding('ReactDOM')) {
            // already there
            return;
          }

          if (!path.scope.hasBinding('React')) {
            // if there's no React present,
            // why would u need ReactDOM
            return;
          }

          // import ReactDOM from 'react-dom'
          const identifier = t.identifier('ReactDOM');
          const importDefaultSpecifier = t.importDefaultSpecifier(identifier);
          const importDeclaration = t.importDeclaration(
            [importDefaultSpecifier],
            t.stringLiteral('react-dom')
          );
          path.unshiftContainer('body', importDeclaration);
        }
      },
      ExportDefaultDeclaration: {
        enter(path: NodePath<ExportDefaultDeclaration>, state: State): void {
          if (!path.scope.hasBinding('React')) {
            // if there's no React present,
            return;
          }
          const {
            opts: { root = 'app', hydrate = false }
          } = state;
          // Only render function component
          if (path.node.declaration.type !== 'FunctionDeclaration') return;

          // Anonymous function
          if (!path.node.declaration.id) return;

          // ReactDOM.render(<DefaultNamedExport />, document.getElementById('rootElementId'))
          // ReactDOM.hydrate
          path.insertAfter(
            t.CallExpression(
              t.memberExpression(
                t.identifier('ReactDOM'),
                t.identifier(hydrate === true ? 'hydrate' : 'render')
              ),
              [
                t.CallExpression(
                  t.memberExpression(
                    t.identifier('React'),
                    t.identifier('createElement')
                  ),
                  [t.identifier(path.node.declaration.id.name)]
                ),
                t.CallExpression(
                  t.memberExpression(
                    t.identifier('document'),
                    t.identifier('getElementById')
                  ),
                  [t.stringLiteral(root)]
                )
              ]
            )
          );
        }
      }
    }
  };
}
