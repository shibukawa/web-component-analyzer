import React, { Component } from 'react';

interface ClassComponentProps {
  name: string;
  age: number;
}

interface ClassComponentState {
  isActive: boolean;
  counter: number;
}

export default class ClassComponent extends Component<ClassComponentProps, ClassComponentState> {
  constructor(props: ClassComponentProps) {
    super(props);
    this.state = {
      isActive: false,
      counter: 0
    };
  }

  handleToggle = () => {
    this.setState({ isActive: !this.state.isActive });
  };

  handleIncrement = () => {
    this.setState({ counter: this.state.counter + 1 });
  };

  render() {
    const { name, age } = this.props;
    const { isActive, counter } = this.state;

    return (
      <div>
        <h1>{name}</h1>
        <p>Age: {age}</p>
        <p>Status: {isActive ? 'Active' : 'Inactive'}</p>
        <p>Counter: {counter}</p>
        <button onClick={this.handleToggle}>Toggle</button>
        <button onClick={this.handleIncrement}>Increment</button>
      </div>
    );
  }
}
