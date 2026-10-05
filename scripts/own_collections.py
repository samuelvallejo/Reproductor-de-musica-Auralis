"""Own doubly linked list for the optional sample generator; no list library."""


class Node:
    def __init__(self, value):
        self.value = value
        self.previous = None
        self.next = None


class LinkedList:
    def __init__(self):
        self.head = None
        self.tail = None
        self.size = 0

    def append(self, value):
        node = Node(value)
        node.previous = self.tail
        if self.tail is None:
            self.head = node
        else:
            self.tail.next = node
        self.tail = node
        self.size += 1
        return self

    def at(self, index):
        if not isinstance(index, int) or isinstance(index, bool) or index < 0 or index >= self.size:
            raise IndexError("Invalid node index")
        node = self.head
        for _ in range(index):
            node = node.next
        return node.value

    def __iter__(self):
        node = self.head
        while node is not None:
            yield node.value
            node = node.next
