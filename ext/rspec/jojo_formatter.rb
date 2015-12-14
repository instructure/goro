RSpec::Support.require_rspec_core "formatters/base_formatter"

class JojoFormatter < RSpec::Core::Formatters::BaseFormatter
  RSpec::Core::Formatters.register self, *[
    :start,
    :close,
    :message,
    :dump_summary,
    :dump_profile,
    :example_passed,
    :example_failed,
    :seed,
  ]

  def initialize(_output)
    super
  end

  def start(message)
    write({
      name: 'group_started',
      expected_count: message.count
    })
  end

  def close(message)
    write({
      name: 'group_finished'
    })
  end

  def message(_notification)
  end

  def dump_summary(_summary)
  end

  def seed(_notification)
  end

  def dump_profile(_profile)
  end

  def example_passed(notification)
    example = notification.example

    write({
      name: 'example_passed',
      example: {
        id: example.id,
        description: example.description,
        full_description: example.full_description,
        location: example.location,
        pending: example.pending?
      }
    })
  end

  def example_failed(notification)
    example = notification.example

    write({
      name: 'example_failed',
      example: {
        id: example.id,
        description: example.description,
        full_description: example.full_description,
        location: example.location,
        pending: example.pending?,
        failure: example.execution_result.exception.message,
      },
    })
  end

  private

  def write(msg)
    STDOUT.write(msg.to_json + "\n")
    STDOUT.flush
  end
end
