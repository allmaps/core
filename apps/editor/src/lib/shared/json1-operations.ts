type RemoveInstruction = {
  r: true
}

type InsertInstruction = {
  i: unknown
}

type ReplaceInstruction = {
  r: true
  i: unknown
}

type Instruction = InsertInstruction | ReplaceInstruction | RemoveInstruction

type ParsedOp = {
  mapId: string
  type: string
  key?: string | number
  instruction: Instruction
}

export function isReplaceInstruction(i: Instruction): i is ReplaceInstruction {
  return 'r' in i && 'i' in i
}

export function isRemoveInstruction(i: Instruction): i is RemoveInstruction {
  return 'r' in i && !('i' in i)
}

export function isInsertInstruction(i: Instruction): i is InsertInstruction {
  return 'i' in i && !('r' in i)
}

function isObject(obj: unknown) {
  return typeof obj === 'object'
}

function isArray(obj: unknown): obj is Array<unknown> {
  return Array.isArray(obj)
}

function parseMapOp(mapId: string, op: unknown): ParsedOp | ParsedOp[] {
  if (isArray(op)) {
    if (isArray(op[0])) {
      return op.map((op: unknown) => parseMapOp(mapId, op)).flat()
    } else if (isObject(op[0])) {
      return {
        mapId,
        type: 'map',
        instruction: op[0] as Instruction
      }
    } else if (typeof op[0] === 'string') {
      const prop = op[0]
      return parsePropOp(mapId, prop, op.slice(1))
    }
  }

  throw new Error('Cannot parse operation')
}

function parsePropOp(
  mapId: string,
  prop: string,
  op: unknown
): ParsedOp | ParsedOp[] {
  if (isArray(op)) {
    if (isArray(op[0])) {
      return op.map((op) => parsePropOp(mapId, prop, op)).flat()
    } else if (isObject(op[0])) {
      throw new Error('Oh no!')
    } else if (typeof op[0] === 'string' || typeof op[0] === 'number') {
      const key = op[0]

      return {
        mapId,
        type: prop,
        key,
        instruction: op[1] as Instruction
      }
    }
  }

  throw new Error('Cannot parse operation')
}

export function parseOperations(op: unknown): ParsedOp[] {
  if (isArray(op)) {
    if (isArray(op[0])) {
      return op.map(parseOperations).flat()
    } else if (typeof op[0] === 'string') {
      const mapId = op[0]
      return [parseMapOp(mapId, op.slice(1))].flat()
    }
  }

  throw new Error('Cannot parse operation')
}
