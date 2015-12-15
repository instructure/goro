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
    @stdout_interceptor = StreamInterceptor.new(STDOUT)

    @stream_lock = Mutex.new
    @stream = @stdout_interceptor.original
    @stdout_interceptor.capture { |buf| write({ name: 'stdout', data: buf }) }

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

    @stdout_interceptor.release
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
    @stream_lock.synchronize do
      @stream.write(msg.to_json + "\n")
      @stream.flush
    end
  end

  private

  class StreamInterceptor
    attr_reader :original

    def initialize(fd)
      @target = fd
      @original = fd.clone
    end

    def capture(&on_buf)
      sink = IO.pipe
      sink[0].autoclose = false

      @target.reopen(sink[1])

      @poller = Thread.new do
        begin
          result = sink[0].read_nonblock(1024)
          on_buf.call(result)
        rescue IO::WaitReadable
          IO.select(sink)
          retry
        rescue IO::WaitWritable
          IO.select(nil, sink)
          retry
        end
      end
    end

    def release
      @poller.kill
      @target.reopen(@original)
    end
  end
end
