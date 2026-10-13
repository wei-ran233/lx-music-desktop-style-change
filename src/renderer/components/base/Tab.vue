<template>
  <ul :class="[$style.list, $style[align]]" role="tablist">
    <li
      v-for="item in list"
      :key="item[itemKey]" :class="[$style.listItem, {[$style.active]: modelValue == item[itemKey]}]" tabindex="-1" role="tab"
      :aria-label="item[itemLabel]" ignore-tip :aria-selected="modelValue == item[itemKey]" @click="handleToggle(item[itemKey])"
    >
      <span :class="$style.label">{{ item[itemLabel] }}</span>
    </li>
  </ul>
</template>

<script>

export default {
  props: {
    list: {
      type: Array,
      default() {
        return []
      },
    },
    align: {
      type: String,
      default: 'left',
    },
    itemKey: {
      type: String,
      default: 'id',
    },
    itemLabel: {
      type: String,
      default: 'label',
    },
    modelValue: {
      type: [String, Number],
      default: '',
    },
  },
  emits: ['update:modelValue', 'change'],
  setup(props, { emit }) {
    const handleToggle = id => {
      if (id == props.modelValue) return
      emit('update:modelValue', id)
      emit('change', id)
    }

    return {
      handleToggle,
    }
  },
}
</script>

<style lang="less" module>
@import '@renderer/assets/styles/layout.less';

.list {
  display: flex;
  flex-flow: row nowrap;
  font-size: 12px;
  gap: clamp(12px, 2vw, 25px);
  padding: 0 var(--space-content-x);
  overflow-x: auto;
  min-width: 0;

  &.left {
    justify-content: flex-start;
  }
  &.center {
    justify-content: center;
  }
  &.right {
    justify-content: flex-end;
  }
}
.listItem {
  display: block;
  // padding: 5px 15px;
  cursor: pointer;
  transition: color @transition-normal;

  >.label {
    font-weight: 500;
  }

  &:hover {
    color: var(--color-primary);
  }


  &.active {
    color: var(--color-primary);
    cursor: default;

    >.label {
      font-weight: 600;
      &:after {
        // background-color: var(--color-primary);
        opacity: 1;
        transform: translateY(0) scaleX(1);
      }
    }
  }
}

.label {
  display: block;
  position: relative;
  padding: 8px 0;
  &:after {
    .mixin-after();
    left: 0;
    bottom: 0;
    width: 100%;
    height: 3px;
    border-radius: var(--radius-pill);
    background-color: transparent;
    transform: translateY(-4px) scaleX(0);
    opacity: 0;
    background-color: var(--color-primary);
    transition: transform var(--transition-base), opacity var(--transition-fast);
  }
}
</style>
