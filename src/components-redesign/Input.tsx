/**
 * Input — redesign primitive с floating label.
 *
 * Особенности:
 * • Floating label корректно работает с Chrome autofill (CSS :-webkit-autofill).
 * • password=true → встроенный toggle eye/eyeOff (заменяет iconRight).
 * • clearable → крестик появляется когда есть value (заменяет iconRight,
 *   но конфликт с password=true решается приоритетом password).
 * • iconRight без onClick рендерится как декоративная иконка (pointer-events:none).
 * • iconRight с onClick рендерится как <button> с aria-label.
 * • Поддержка <textarea> через as="textarea".
 *
 * Usage:
 *   <Input label="Email" type="email" />
 *   <Input label="Пароль" password status="error" hint="Неверный пароль" />
 *   <Input label="Поиск" clearable value={q} onChange={...} onClear={() => setQ('')} />
 *   <Input label="О себе" as="textarea" rows={4} />
 */

import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  type ReactNode,
  type Ref,
  type MouseEvent,
} from 'react';
import { Eye, EyeOff, X } from 'lucide-react';
import s from './Input.module.css';

export type InputStatus = 'default' | 'error' | 'success';
export type InputSize = 'sm' | 'md';

type CommonProps = {
  label: string;
  status?: InputStatus;
  hint?: string;
  iconLeft?: ReactNode;
  /** Декоративная иконка (без onClick) или интерактивная кнопка (если onIconRightClick передан). */
  iconRight?: ReactNode;
  /** Делает iconRight кликабельной кнопкой с этим обработчиком. */
  onIconRightClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  /** aria-label для iconRight-кнопки (обязателен когда onIconRightClick). */
  iconRightLabel?: string;
  inputSize?: InputSize;
};

type InputOnlyProps = {
  /** Включает встроенный toggle видимости пароля. Имеет приоритет над iconRight. */
  password?: boolean;
  /** Показывать крестик-очистка (только когда value не пустой). */
  clearable?: boolean;
  /** Колбэк очистки (вызывается крестиком). */
  onClear?: () => void;
};

type InputProps = CommonProps &
  InputOnlyProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, keyof CommonProps | 'size'> & {
    as?: 'input';
  };

type TextareaProps = CommonProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, keyof CommonProps> & {
    as: 'textarea';
  };

type Props = InputProps | TextareaProps;

const Input = forwardRef<HTMLInputElement | HTMLTextAreaElement, Props>(function Input(props, ref) {
  const {
    label,
    status = 'default',
    hint,
    iconLeft,
    iconRight,
    onIconRightClick,
    iconRightLabel,
    inputSize = 'md',
    as: Tag = 'input',
    className = '',
    id: idProp,
    ...rest
  } = props;

  const reactId = useId();
  const stableId = idProp ?? `rd-input-${reactId}`;

  // Password toggle state (только для as='input')
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordInput =
    Tag === 'input' && (props as InputProps).password === true;
  const isClearable =
    Tag === 'input' && (props as InputProps).clearable === true;
  const onClear = (props as InputProps).onClear;

  // Если password=true — type определяется toggle'ом и переопределяет переданный type
  const inputType = isPasswordInput
    ? showPassword
      ? 'text'
      : 'password'
    : (rest as InputHTMLAttributes<HTMLInputElement>).type;

  // value-based: показывать ли клир-крестик
  const currentValue = (rest as InputHTMLAttributes<HTMLInputElement>).value;
  const hasValue =
    currentValue !== undefined && currentValue !== null && String(currentValue).length > 0;

  // Определяем что показать в правом слоте (приоритет: password > clearable+hasValue > iconRight)
  type RightSlot =
    | { kind: 'password' }
    | { kind: 'clear' }
    | { kind: 'button'; node: ReactNode; onClick: (e: MouseEvent<HTMLButtonElement>) => void; label: string }
    | { kind: 'icon'; node: ReactNode }
    | null;

  const rightSlot: RightSlot = isPasswordInput
    ? { kind: 'password' }
    : isClearable && hasValue
      ? { kind: 'clear' }
      : iconRight && onIconRightClick
        ? {
            kind: 'button',
            node: iconRight,
            onClick: onIconRightClick,
            label: iconRightLabel ?? 'Действие',
          }
        : iconRight
          ? { kind: 'icon', node: iconRight }
          : null;

  const wrapperCls = [
    s['rd-field'],
    status !== 'default' ? s[`rd-field-${status}`] : '',
    Tag === 'textarea' ? s['rd-field-textarea'] : '',
    inputSize === 'sm' ? s['rd-field-sm'] : '',
  ]
    .filter(Boolean)
    .join(' ');

  const inputCls = [
    s['rd-input'],
    Tag === 'textarea' ? s['rd-input-textarea'] : '',
    iconLeft ? s['rd-input-has-left'] : '',
    rightSlot ? s['rd-input-has-right'] : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const ariaDescribedBy = hint ? `${stableId}-hint` : undefined;

  return (
    <div className={wrapperCls}>
      <div className={s['rd-field-shell']}>
        {iconLeft && (
          <span className={`${s['rd-field-icon']} ${s['rd-field-icon-left']}`} aria-hidden="true">
            {iconLeft}
          </span>
        )}

        {Tag === 'textarea' ? (
          <textarea
            ref={ref as Ref<HTMLTextAreaElement>}
            id={stableId}
            className={inputCls}
            placeholder=" "
            aria-invalid={status === 'error' || undefined}
            aria-describedby={ariaDescribedBy}
            {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
        ) : (
          <input
            ref={ref as Ref<HTMLInputElement>}
            id={stableId}
            className={inputCls}
            placeholder=" "
            aria-invalid={status === 'error' || undefined}
            aria-describedby={ariaDescribedBy}
            {...(rest as InputHTMLAttributes<HTMLInputElement>)}
            type={inputType}
          />
        )}

        <label htmlFor={stableId} className={s['rd-label']}>
          {label}
        </label>

        {rightSlot?.kind === 'password' && (
          <button
            type="button"
            className={`${s['rd-field-icon']} ${s['rd-field-icon-right']} ${s['rd-field-icon-button']}`}
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
            aria-pressed={showPassword}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}

        {rightSlot?.kind === 'clear' && (
          <button
            type="button"
            className={`${s['rd-field-icon']} ${s['rd-field-icon-right']} ${s['rd-field-icon-button']}`}
            onClick={() => onClear?.()}
            aria-label="Очистить"
            tabIndex={-1}
          >
            <X size={18} />
          </button>
        )}

        {rightSlot?.kind === 'button' && (
          <button
            type="button"
            className={`${s['rd-field-icon']} ${s['rd-field-icon-right']} ${s['rd-field-icon-button']}`}
            onClick={rightSlot.onClick}
            aria-label={rightSlot.label}
          >
            {rightSlot.node}
          </button>
        )}

        {rightSlot?.kind === 'icon' && (
          <span
            className={`${s['rd-field-icon']} ${s['rd-field-icon-right']}`}
            aria-hidden="true"
          >
            {rightSlot.node}
          </span>
        )}
      </div>

      {hint && (
        <p id={`${stableId}-hint`} className={s['rd-field-hint']}>
          {hint}
        </p>
      )}
    </div>
  );
});

export default Input;
